Add-Type -AssemblyName System.Drawing

try {
    $pngPath = (Resolve-Path 'src\assets\icon.png').Path
    $icoPath = 'src\assets\icon.ico'
    
    $img = [System.Drawing.Image]::FromFile($pngPath)
    $bmp256 = New-Object System.Drawing.Bitmap($img, 256, 256)
    $hIcon = $bmp256.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    
    $fs = [System.IO.File]::OpenWrite($icoPath)
    $icon.Save($fs)
    $fs.Close()
    $fs.Dispose()
    $icon.Dispose()
    $bmp256.Dispose()
    $img.Dispose()
    
    $size = (Get-Item $icoPath).Length
    Write-Host "[OK] icon.ico generated: $size bytes"
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)"
    exit 1
}
