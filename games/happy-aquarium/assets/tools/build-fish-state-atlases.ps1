param(
    [string]$AssetRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($AssetRoot)
$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$states = @('swim', 'hungry', 'eat', 'sick', 'death', 'bubble')

Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class AquariumFixedStateAtlas
{
    private sealed class Component
    {
        public int MinX = Int32.MaxValue;
        public int MinY = Int32.MaxValue;
        public int MaxX = Int32.MinValue;
        public int MaxY = Int32.MinValue;
        public long SumX;
        public long SumY;
        public int Count;
        public int Cell;
    }

    private static void ConfigurePixelArt(Graphics graphics)
    {
        graphics.CompositingMode = CompositingMode.SourceCopy;
        graphics.CompositingQuality = CompositingQuality.HighSpeed;
        graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
        graphics.PixelOffsetMode = PixelOffsetMode.Half;
        graphics.SmoothingMode = SmoothingMode.None;
    }

    public static void BuildContentAware(string inputPath, string outputPath, int columns, int rows, int frameSize)
    {
        using (var loaded = new Bitmap(inputPath))
        using (var source = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.DrawImageUnscaled(loaded, 0, 0);
            }

            int width = source.Width;
            int height = source.Height;
            var sourceRect = new Rectangle(0, 0, width, height);
            var sourceData = source.LockBits(sourceRect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = Math.Abs(sourceData.Stride);
            byte[] pixels = new byte[stride * height];
            Marshal.Copy(sourceData.Scan0, pixels, 0, pixels.Length);
            source.UnlockBits(sourceData);

            int pixelCount = checked(width * height);
            int[] labels = new int[pixelCount];
            int[] queue = new int[pixelCount];
            var components = new Component[pixelCount + 1];

            int nextLabel = 0;
            for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
            {
                int index = y * width + x;
                if (labels[index] != 0 || pixels[y * stride + x * 4 + 3] == 0) continue;

                int label = ++nextLabel;
                var component = new Component();
                int head = 0;
                int tail = 0;
                labels[index] = label;
                queue[tail++] = index;

                while (head < tail)
                {
                    int current = queue[head++];
                    int currentX = current % width;
                    int currentY = current / width;
                    component.MinX = Math.Min(component.MinX, currentX);
                    component.MinY = Math.Min(component.MinY, currentY);
                    component.MaxX = Math.Max(component.MaxX, currentX);
                    component.MaxY = Math.Max(component.MaxY, currentY);
                    component.SumX += currentX;
                    component.SumY += currentY;
                    component.Count++;

                    int minY = Math.Max(0, currentY - 1);
                    int maxY = Math.Min(height - 1, currentY + 1);
                    int minX = Math.Max(0, currentX - 1);
                    int maxX = Math.Min(width - 1, currentX + 1);
                    for (int neighborY = minY; neighborY <= maxY; neighborY++)
                    for (int neighborX = minX; neighborX <= maxX; neighborX++)
                    {
                        int neighbor = neighborY * width + neighborX;
                        if (labels[neighbor] != 0) continue;
                        if (pixels[neighborY * stride + neighborX * 4 + 3] == 0) continue;
                        labels[neighbor] = label;
                        queue[tail++] = neighbor;
                    }
                }

                double centerX = (double)component.SumX / component.Count;
                double centerY = (double)component.SumY / component.Count;
                int column = Math.Min(columns - 1, Math.Max(0, (int)(centerX * columns / width)));
                int row = Math.Min(rows - 1, Math.Max(0, (int)(centerY * rows / height)));
                component.Cell = row * columns + column;
                components[label] = component;
            }

            int cellCount = columns * rows;
            var bounds = new Rectangle[cellCount];
            var hasContent = new bool[cellCount];
            for (int label = 1; label <= nextLabel; label++)
            {
                Component component = components[label];
                var componentBounds = Rectangle.FromLTRB(
                    component.MinX,
                    component.MinY,
                    component.MaxX + 1,
                    component.MaxY + 1);
                int cell = component.Cell;
                bounds[cell] = hasContent[cell] ? Rectangle.Union(bounds[cell], componentBounds) : componentBounds;
                hasContent[cell] = true;
            }

            for (int cell = 0; cell < cellCount; cell++)
                if (!hasContent[cell])
                    throw new InvalidOperationException("No visible sprite content assigned to cell " + cell + ".");

            double[] rowScale = new double[rows];
            const int padding = 4;
            int available = frameSize - padding * 2;
            for (int row = 0; row < rows; row++)
            {
                int maxWidth = 1;
                int maxHeight = 1;
                for (int column = 0; column < columns; column++)
                {
                    Rectangle cellBounds = bounds[row * columns + column];
                    maxWidth = Math.Max(maxWidth, cellBounds.Width);
                    maxHeight = Math.Max(maxHeight, cellBounds.Height);
                }
                rowScale[row] = Math.Min((double)available / maxWidth, (double)available / maxHeight);
            }

            using (var atlas = new Bitmap(columns * frameSize, rows * frameSize, PixelFormat.Format32bppArgb))
            using (var atlasGraphics = Graphics.FromImage(atlas))
            {
                ConfigurePixelArt(atlasGraphics);
                atlasGraphics.Clear(Color.Transparent);

                for (int cell = 0; cell < cellCount; cell++)
                {
                    Rectangle crop = bounds[cell];
                    using (var isolated = new Bitmap(crop.Width, crop.Height, PixelFormat.Format32bppArgb))
                    {
                        var isolatedRect = new Rectangle(0, 0, crop.Width, crop.Height);
                        var isolatedData = isolated.LockBits(isolatedRect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                        int isolatedStride = Math.Abs(isolatedData.Stride);
                        byte[] isolatedPixels = new byte[isolatedStride * crop.Height];

                        for (int localY = 0; localY < crop.Height; localY++)
                        for (int localX = 0; localX < crop.Width; localX++)
                        {
                            int sourceX = crop.X + localX;
                            int sourceY = crop.Y + localY;
                            int label = labels[sourceY * width + sourceX];
                            if (label == 0 || components[label].Cell != cell) continue;
                            int sourceOffset = sourceY * stride + sourceX * 4;
                            int targetOffset = localY * isolatedStride + localX * 4;
                            isolatedPixels[targetOffset] = pixels[sourceOffset];
                            isolatedPixels[targetOffset + 1] = pixels[sourceOffset + 1];
                            isolatedPixels[targetOffset + 2] = pixels[sourceOffset + 2];
                            isolatedPixels[targetOffset + 3] = pixels[sourceOffset + 3];
                        }

                        Marshal.Copy(isolatedPixels, 0, isolatedData.Scan0, isolatedPixels.Length);
                        isolated.UnlockBits(isolatedData);

                        int row = cell / columns;
                        int column = cell % columns;
                        int targetWidth = Math.Max(1, (int)Math.Round(crop.Width * rowScale[row]));
                        int targetHeight = Math.Max(1, (int)Math.Round(crop.Height * rowScale[row]));
                        int targetX = column * frameSize + (frameSize - targetWidth) / 2;
                        int targetY = row * frameSize + (frameSize - targetHeight) / 2;
                        atlasGraphics.DrawImage(
                            isolated,
                            new Rectangle(targetX, targetY, targetWidth, targetHeight),
                            new Rectangle(0, 0, crop.Width, crop.Height),
                            GraphicsUnit.Pixel);
                    }
                }

                atlas.Save(outputPath, ImageFormat.Png);
            }
        }
    }

    public static void StackRows(string[] rowPaths, string outputPath, int frameSize)
    {
        if (rowPaths.Length == 0) throw new ArgumentException("At least one row is required.");
        using (var atlas = new Bitmap(frameSize * 4, frameSize * rowPaths.Length, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(atlas))
        {
            ConfigurePixelArt(graphics);
            graphics.Clear(Color.Transparent);
            for (int row = 0; row < rowPaths.Length; row++)
            using (var sheet = new Bitmap(rowPaths[row]))
            {
                if (sheet.Width != frameSize * 4 || sheet.Height != frameSize)
                    throw new InvalidOperationException("Unexpected row size: " + rowPaths[row]);
                graphics.DrawImageUnscaled(sheet, 0, row * frameSize);
            }
            atlas.Save(outputPath, ImageFormat.Png);
        }
    }
}
'@

$drawingAssemblies = [System.AppDomain]::CurrentDomain.GetAssemblies() |
    Where-Object { $_.FullName -match '^System\.Drawing|^System\.Private\.CoreLib|^System\.Private\.Windows|^System\.Collections|^System\.Runtime|^netstandard' } |
    ForEach-Object { $_.Location } |
    Where-Object { $_ }
Add-Type -TypeDefinition $source -ReferencedAssemblies $drawingAssemblies

$results = foreach ($species in $manifest.species) {
    $speciesId = [string]$species.id
    $fishDirectory = Join-Path $root (Join-Path 'fish' $speciesId)
    $outputPath = Join-Path $fishDirectory "$speciesId-states.png"
    [System.IO.Directory]::CreateDirectory($fishDirectory) | Out-Null

    if ([System.IO.File]::Exists($outputPath) -and -not $Force) {
        throw "Refusing to overwrite existing output: $outputPath"
    }

    $inputAtlas = Join-Path $root "source/fish/$speciesId/$speciesId-state-atlas-transparent.png"
    if ([System.IO.File]::Exists($inputAtlas)) {
        [AquariumFixedStateAtlas]::BuildContentAware($inputAtlas, $outputPath, 4, 6, 64)
        $sourceMode = 'content-aware-atlas'
    }
    else {
        $sourceDirectory = Join-Path $root "source/fish/$speciesId"
        $sourceNames = @(
            "$speciesId-swim-generated.png",
            "$speciesId-hungry-transparent.png",
            "$speciesId-eat-transparent.png",
            "$speciesId-sick-transparent.png",
            "$speciesId-death-transparent.png",
            "$speciesId-bubble-transparent.png"
        )
        $sourceRows = @($sourceNames | ForEach-Object { Join-Path $sourceDirectory $_ })
        $missing = @($sourceRows | Where-Object { -not [System.IO.File]::Exists($_) })
        if ($missing.Count -gt 0) {
            throw "No combined source atlas and missing high-resolution state rows for ${speciesId}: $($missing -join ', ')"
        }

        $tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $tempDirectory = [System.IO.Path]::GetFullPath((Join-Path $tempBase "happy-aquarium-$([Guid]::NewGuid().ToString('N'))"))
        if (-not $tempDirectory.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Temporary directory escaped the system temp root: $tempDirectory"
        }
        [System.IO.Directory]::CreateDirectory($tempDirectory) | Out-Null
        try {
            $rowPaths = for ($row = 0; $row -lt $sourceRows.Count; $row++) {
                $tempRow = Join-Path $tempDirectory "row-$row.png"
                [AquariumFixedStateAtlas]::BuildContentAware($sourceRows[$row], $tempRow, 4, 1, 64)
                $tempRow
            }
            [AquariumFixedStateAtlas]::StackRows($rowPaths, $outputPath, 64)
        }
        finally {
            if ([System.IO.Directory]::Exists($tempDirectory)) {
                [System.IO.Directory]::Delete($tempDirectory, $true)
            }
        }
        $sourceMode = 'content-aware-row-sources'
    }

    $image = [System.Drawing.Bitmap]::new($outputPath)
    try {
        [pscustomobject]@{
            Species = $speciesId
            File = $outputPath
            Size = "$($image.Width)x$($image.Height)"
            SourceMode = $sourceMode
        }
    }
    finally {
        $image.Dispose()
    }
}

$results | Format-Table -AutoSize
