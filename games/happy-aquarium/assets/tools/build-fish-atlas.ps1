param(
    [Parameter(Mandatory = $true)]
    [string]$InputAtlas,

    [Parameter(Mandatory = $true)]
    [string]$SpeciesId,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [Parameter(Mandatory = $true)]
    [string]$TransparentAtlas,

    [switch]$Force,

    [string[]]$RowOutputStems,

    [string[]]$CellOutputStems,

    [int]$Columns = 4,

    [int]$Rows = 6
)

$ErrorActionPreference = 'Stop'

if ($SpeciesId -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw "SpeciesId must be kebab-case: $SpeciesId"
}

$inputFull = [System.IO.Path]::GetFullPath($InputAtlas)
$outputFull = [System.IO.Path]::GetFullPath($OutputDirectory)
$transparentFull = [System.IO.Path]::GetFullPath($TransparentAtlas)

if (-not [System.IO.File]::Exists($inputFull)) {
    throw "Input atlas does not exist: $inputFull"
}

[System.IO.Directory]::CreateDirectory($outputFull) | Out-Null
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($transparentFull)) | Out-Null

$states = @('swim', 'hungry', 'eat', 'sick', 'death', 'bubble')
if ($RowOutputStems -and $CellOutputStems) {
    throw 'Use RowOutputStems or CellOutputStems, not both.'
}
if ($RowOutputStems) {
    if ($RowOutputStems.Count -ne $Rows) { throw "RowOutputStems must contain exactly $Rows names." }
    $targets = @($transparentFull) + ($RowOutputStems | ForEach-Object { Join-Path $outputFull "$_.png" })
}
elseif ($CellOutputStems) {
    if ($CellOutputStems.Count -ne ($Columns * $Rows)) { throw "CellOutputStems must contain exactly $($Columns * $Rows) names." }
    $targets = @($transparentFull) + ($CellOutputStems | ForEach-Object { Join-Path $outputFull "$_.png" })
}
else {
    $targets = @($transparentFull, (Join-Path $outputFull "$SpeciesId-idle.png"))
    $targets += $states | ForEach-Object { Join-Path $outputFull "$SpeciesId-$_.png" }
}

if (-not $Force) {
    $existing = $targets | Where-Object { [System.IO.File]::Exists($_) }
    if ($existing) {
        throw "Refusing to overwrite existing output: $($existing -join ', ')"
    }
}

Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class AquariumSpriteAtlas
{
    private static bool IsBackground(byte b, byte g, byte r)
    {
        int min = Math.Min(r, Math.Min(g, b));
        int max = Math.Max(r, Math.Max(g, b));
        return min >= 235 && (max - min) <= 18;
    }

    public static void RemoveConnectedLightBackground(string inputPath, string outputPath)
    {
        using (var loaded = new Bitmap(inputPath))
        using (var bitmap = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bitmap))
            {
                g.CompositingMode = CompositingMode.SourceCopy;
                g.DrawImageUnscaled(loaded, 0, 0);
            }

            int width = bitmap.Width;
            int height = bitmap.Height;
            var rect = new Rectangle(0, 0, width, height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = Math.Abs(data.Stride);
            byte[] pixels = new byte[stride * height];
            Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

            bool[] visited = new bool[width * height];
            int[] queue = new int[width * height];
            int head = 0;
            int tail = 0;

            Action<int, int> enqueue = (x, y) =>
            {
                int index = y * width + x;
                if (visited[index]) return;
                int offset = y * stride + x * 4;
                if (!IsBackground(pixels[offset], pixels[offset + 1], pixels[offset + 2])) return;
                visited[index] = true;
                queue[tail++] = index;
            };

            for (int x = 0; x < width; x++)
            {
                enqueue(x, 0);
                enqueue(x, height - 1);
            }
            for (int y = 0; y < height; y++)
            {
                enqueue(0, y);
                enqueue(width - 1, y);
            }

            while (head < tail)
            {
                int index = queue[head++];
                int x = index % width;
                int y = index / width;
                int offset = y * stride + x * 4;
                pixels[offset] = 0;
                pixels[offset + 1] = 0;
                pixels[offset + 2] = 0;
                pixels[offset + 3] = 0;

                if (x > 0) enqueue(x - 1, y);
                if (x + 1 < width) enqueue(x + 1, y);
                if (y > 0) enqueue(x, y - 1);
                if (y + 1 < height) enqueue(x, y + 1);
            }

            Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
            bitmap.UnlockBits(data);
            bitmap.Save(outputPath, ImageFormat.Png);
        }
    }

    private static void ConfigurePixelArt(Graphics g)
    {
        g.CompositingMode = CompositingMode.SourceCopy;
        g.CompositingQuality = CompositingQuality.HighSpeed;
        g.InterpolationMode = InterpolationMode.NearestNeighbor;
        g.PixelOffsetMode = PixelOffsetMode.Half;
        g.SmoothingMode = SmoothingMode.None;
    }

    public static void Split(string atlasPath, string speciesId, string outputDirectory)
    {
        string[] states = { "swim", "hungry", "eat", "sick", "death", "bubble" };
        using (var atlas = new Bitmap(atlasPath))
        {
            int widthRemainder = atlas.Width % 4;
            int heightRemainder = atlas.Height % 6;
            if (widthRemainder > 5 || heightRemainder > 5)
                throw new InvalidOperationException("Atlas edge error is too large for safe 4x6 slicing.");

            int usableWidth = atlas.Width - widthRemainder;
            int usableHeight = atlas.Height - heightRemainder;
            int cellWidth = usableWidth / 4;
            int cellHeight = usableHeight / 6;

            for (int row = 0; row < states.Length; row++)
            {
                string outputPath = Path.Combine(outputDirectory, speciesId + "-" + states[row] + ".png");
                using (var sheet = new Bitmap(256, 64, PixelFormat.Format32bppArgb))
                using (var g = Graphics.FromImage(sheet))
                {
                    ConfigurePixelArt(g);
                    g.Clear(Color.Transparent);
                    for (int column = 0; column < 4; column++)
                    {
                        var sourceRect = new Rectangle(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
                        var targetRect = new Rectangle(column * 64, 0, 64, 64);
                        g.DrawImage(atlas, targetRect, sourceRect, GraphicsUnit.Pixel);
                    }
                    sheet.Save(outputPath, ImageFormat.Png);
                }
            }

            string idlePath = Path.Combine(outputDirectory, speciesId + "-idle.png");
            using (var idle = new Bitmap(64, 64, PixelFormat.Format32bppArgb))
            using (var g = Graphics.FromImage(idle))
            {
                ConfigurePixelArt(g);
                g.Clear(Color.Transparent);
                g.DrawImage(atlas, new Rectangle(0, 0, 64, 64), new Rectangle(0, 0, cellWidth, cellHeight), GraphicsUnit.Pixel);
                idle.Save(idlePath, ImageFormat.Png);
            }
        }
    }

    public static void SplitRows(string atlasPath, string outputDirectory, string[] outputStems, int columns, int rows)
    {
        if (outputStems.Length != rows) throw new InvalidOperationException("Row output count does not match grid rows.");
        using (var atlas = new Bitmap(atlasPath))
        {
            int widthRemainder = atlas.Width % columns;
            int heightRemainder = atlas.Height % rows;
            if (widthRemainder > 5 || heightRemainder > 5)
                throw new InvalidOperationException("Atlas edge error is too large for safe row slicing.");
            int cellWidth = (atlas.Width - widthRemainder) / columns;
            int cellHeight = (atlas.Height - heightRemainder) / rows;

            for (int row = 0; row < rows; row++)
            {
                string outputPath = Path.Combine(outputDirectory, outputStems[row] + ".png");
                using (var sheet = new Bitmap(columns * 64, 64, PixelFormat.Format32bppArgb))
                using (var g = Graphics.FromImage(sheet))
                {
                    ConfigurePixelArt(g);
                    g.Clear(Color.Transparent);
                    for (int column = 0; column < columns; column++)
                    {
                        var sourceRect = new Rectangle(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
                        var targetRect = new Rectangle(column * 64, 0, 64, 64);
                        g.DrawImage(atlas, targetRect, sourceRect, GraphicsUnit.Pixel);
                    }
                    sheet.Save(outputPath, ImageFormat.Png);
                }
            }
        }
    }

    public static void SplitCells(string atlasPath, string outputDirectory, string[] outputStems, int columns, int rows)
    {
        if (outputStems.Length != columns * rows) throw new InvalidOperationException("Cell output count does not match grid.");
        using (var atlas = new Bitmap(atlasPath))
        {
            int widthRemainder = atlas.Width % columns;
            int heightRemainder = atlas.Height % rows;
            if (widthRemainder > 5 || heightRemainder > 5)
                throw new InvalidOperationException("Atlas edge error is too large for safe cell slicing.");
            int cellWidth = (atlas.Width - widthRemainder) / columns;
            int cellHeight = (atlas.Height - heightRemainder) / rows;

            for (int row = 0; row < rows; row++)
            for (int column = 0; column < columns; column++)
            {
                int index = row * columns + column;
                string outputPath = Path.Combine(outputDirectory, outputStems[index] + ".png");
                using (var cell = new Bitmap(64, 64, PixelFormat.Format32bppArgb))
                using (var g = Graphics.FromImage(cell))
                {
                    ConfigurePixelArt(g);
                    g.Clear(Color.Transparent);
                    var sourceRect = new Rectangle(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
                    g.DrawImage(atlas, new Rectangle(0, 0, 64, 64), sourceRect, GraphicsUnit.Pixel);
                    cell.Save(outputPath, ImageFormat.Png);
                }
            }
        }
    }
}
'@

[System.Drawing.Bitmap] | Out-Null
$drawingAssemblies = [System.AppDomain]::CurrentDomain.GetAssemblies() |
    Where-Object { $_.FullName -match '^System\.Drawing|^System\.Private\.Windows' } |
    ForEach-Object { $_.Location } |
    Where-Object { $_ }
Add-Type -TypeDefinition $source -ReferencedAssemblies $drawingAssemblies

[AquariumSpriteAtlas]::RemoveConnectedLightBackground($inputFull, $transparentFull)
if ($RowOutputStems) {
    [AquariumSpriteAtlas]::SplitRows($transparentFull, $outputFull, $RowOutputStems, $Columns, $Rows)
}
elseif ($CellOutputStems) {
    [AquariumSpriteAtlas]::SplitCells($transparentFull, $outputFull, $CellOutputStems, $Columns, $Rows)
}
else {
    [AquariumSpriteAtlas]::Split($transparentFull, $SpeciesId, $outputFull)
}

$results = $targets | ForEach-Object {
    $image = [System.Drawing.Bitmap]::new($_)
    try {
        $corner = $image.GetPixel(0, 0)
        [pscustomobject]@{
            File = $_
            Width = $image.Width
            Height = $image.Height
            PixelFormat = $image.PixelFormat.ToString()
            CornerAlpha = $corner.A
        }
    }
    finally {
        $image.Dispose()
    }
}

$results | Format-Table -AutoSize
