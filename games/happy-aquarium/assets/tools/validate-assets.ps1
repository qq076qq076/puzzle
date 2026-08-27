param(
    [string]$AssetRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($AssetRoot)
Add-Type -AssemblyName System.Drawing

$checked = 0
$runtimeRoot = Join-Path $root 'runtime'

function Assert-Image {
    param([string]$Path, [int]$Width, [int]$Height)

    if (-not [System.IO.File]::Exists($Path)) { throw "Missing asset: $Path" }
    $image = [System.Drawing.Bitmap]::new($Path)
    try {
        if ($image.Width -ne $Width -or $image.Height -ne $Height) {
            throw "Wrong size: $Path is $($image.Width)x$($image.Height), expected ${Width}x${Height}"
        }
        if ($image.PixelFormat.ToString() -notmatch '32bpp.*Argb') {
            throw "Not RGBA: $Path uses $($image.PixelFormat)"
        }
        $corners = @(
            $image.GetPixel(0, 0).A,
            $image.GetPixel($image.Width - 1, 0).A,
            $image.GetPixel(0, $image.Height - 1).A,
            $image.GetPixel($image.Width - 1, $image.Height - 1).A
        )
        if (($corners | Where-Object { $_ -ne 0 }).Count -gt 0) {
            throw "Opaque canvas corner: $Path"
        }
    }
    finally {
        $image.Dispose()
    }
    $script:checked++
}

function Assert-FishAtlasCells {
    param([string]$Path, [int]$Columns = 4, [int]$Rows = 6, [int]$FrameSize = 64)

    $image = [System.Drawing.Bitmap]::new($Path)
    try {
        for ($row = 0; $row -lt $Rows; $row++) {
            for ($column = 0; $column -lt $Columns; $column++) {
                $minX = $FrameSize
                $minY = $FrameSize
                $maxX = -1
                $maxY = -1
                for ($y = 0; $y -lt $FrameSize; $y++) {
                    for ($x = 0; $x -lt $FrameSize; $x++) {
                        if ($image.GetPixel($column * $FrameSize + $x, $row * $FrameSize + $y).A -eq 0) { continue }
                        $minX = [Math]::Min($minX, $x)
                        $minY = [Math]::Min($minY, $y)
                        $maxX = [Math]::Max($maxX, $x)
                        $maxY = [Math]::Max($maxY, $y)
                    }
                }
                if ($maxX -lt 0) {
                    throw "Empty fish atlas cell: $Path row=$row frame=$column"
                }
                if ($minX -eq 0 -or $minY -eq 0 -or $maxX -eq ($FrameSize - 1) -or $maxY -eq ($FrameSize - 1)) {
                    throw "Fish sprite touches a cell edge and may be cropped: $Path row=$row frame=$column"
                }
            }
        }
    }
    finally {
        $image.Dispose()
    }
}

$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'manifest.json') | ConvertFrom-Json
$fishStates = @('swim', 'hungry', 'eat', 'sick', 'death', 'bubble')
if ($manifest.atlas.columns -ne 4 -or $manifest.atlas.rows -ne 6 -or $manifest.atlas.width -ne 256 -or $manifest.atlas.height -ne 384) {
    throw 'manifest.json fish atlas geometry must be 4 columns, 6 rows, and 256x384.'
}
for ($row = 0; $row -lt $fishStates.Count; $row++) {
    $state = $fishStates[$row]
    if ($manifest.states.$state.row -ne $row) {
        throw "manifest.json state row mismatch: $state must use row $row."
    }
}
foreach ($species in $manifest.species) {
    $dir = Join-Path $runtimeRoot (Join-Path 'fish' $species.id)
    $atlasPath = Join-Path $dir "$($species.id)-states.png"
    $runtimePngs = @(Get-ChildItem -LiteralPath $dir -File -Filter '*.png')
    if ($runtimePngs.Count -ne 1 -or $runtimePngs[0].Name -ne "$($species.id)-states.png") {
        throw "Fish runtime directory must contain exactly one canonical atlas: $dir"
    }
    Assert-Image $atlasPath 256 384
    Assert-FishAtlasCells $atlasPath
}

$catalog = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'catalog.json') | ConvertFrom-Json
foreach ($helper in $catalog.helpers) {
    $dir = Join-Path $runtimeRoot (Join-Path 'helpers' $helper.id)
    foreach ($state in $helper.states) {
        $width = if ($state -eq 'idle') { 64 } else { 256 }
        Assert-Image (Join-Path $dir "$($helper.id)-$state.png") $width 64
    }
}
foreach ($device in $catalog.devices) {
    $dir = Join-Path $runtimeRoot (Join-Path 'devices' $device.id)
    foreach ($state in $device.states) {
        Assert-Image (Join-Path $dir "$($device.id)-$state.png") 256 64
    }
}
foreach ($name in $catalog.objects) {
    Assert-Image (Join-Path $runtimeRoot "objects/$name.png") 256 64
}
foreach ($name in $catalog.decorations) {
    Assert-Image (Join-Path $runtimeRoot "decorations/$name.png") 64 64
}
foreach ($name in $catalog.ui) {
    Assert-Image (Join-Path $runtimeRoot "ui/$name.png") 64 64
}

function Assert-Classification {
    param($Groups, [string[]]$Expected, [string]$Category)

    $actual = @($Groups.PSObject.Properties | ForEach-Object { $_.Value })
    $duplicates = @($actual | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    $missing = @($Expected | Where-Object { $_ -notin $actual })
    $unknown = @($actual | Where-Object { $_ -notin $Expected })
    if ($duplicates.Count -or $missing.Count -or $unknown.Count) {
        throw "Invalid $Category classification. Duplicates=[$($duplicates -join ', ')]; Missing=[$($missing -join ', ')]; Unknown=[$($unknown -join ', ')]."
    }
}

Assert-Classification $catalog.classification.fish @($manifest.species.id) 'fish'
Assert-Classification $catalog.classification.helpers @($catalog.helpers.id) 'helpers'
Assert-Classification $catalog.classification.devices @($catalog.devices.id) 'devices'
Assert-Classification $catalog.classification.objects @($catalog.objects) 'objects'
Assert-Classification $catalog.classification.decorations @($catalog.decorations) 'decorations'
Assert-Classification $catalog.classification.ui @($catalog.ui) 'ui'

Write-Output "Validated $checked runtime PNG assets."
