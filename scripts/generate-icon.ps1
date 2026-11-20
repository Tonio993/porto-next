# Marchio locale coerente con l'ancora e i colori della sidebar, senza font o risorse esterne.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outputDirectory = Join-Path $PSScriptRoot '../build'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$images = @()
foreach ($iconSize in @(16, 32, 48, 64, 128, 256)) {
  $bitmap = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#102c3c'))
  $graphics.ScaleTransform($iconSize / 256.0, $iconSize / 256.0)
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#77d2c0'), 12)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawEllipse($pen, 110, 47, 36, 36)
  $graphics.DrawLine($pen, 128, 83, 128, 204)
  $graphics.DrawLine($pen, 83, 112, 173, 112)
  $curve = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $curve.AddBezier(55, 133, 55, 228, 201, 228, 201, 133)
  $graphics.DrawPath($pen, $curve)
  $graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(42,145), [System.Drawing.PointF]::new(55,133), [System.Drawing.PointF]::new(68,145)))
  $graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(188,145), [System.Drawing.PointF]::new(201,133), [System.Drawing.PointF]::new(214,145)))
  $stream = [System.IO.MemoryStream]::new()
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $images += ,@{ Size = $iconSize; Bytes = $stream.ToArray() }
  if ($iconSize -eq 256) { [System.IO.File]::WriteAllBytes((Join-Path $outputDirectory 'icon.png'), $stream.ToArray()) }
  $stream.Dispose()
  $curve.Dispose()
  $pen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
$iconStream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($iconStream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$images.Count)
$imageOffset = 6 + 16 * $images.Count
foreach ($iconImage in $images) {
  $dimension = if ($iconImage.Size -eq 256) { 0 } else { $iconImage.Size }
  $writer.Write([byte]$dimension)
  $writer.Write([byte]$dimension)
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]32)
  $writer.Write([uint32]$iconImage.Bytes.Length)
  $writer.Write([uint32]$imageOffset)
  $imageOffset += $iconImage.Bytes.Length
}
foreach ($iconImage in $images) { $writer.Write([byte[]]$iconImage.Bytes) }
[System.IO.File]::WriteAllBytes((Join-Path $outputDirectory 'icon.ico'), $iconStream.ToArray())
$writer.Dispose()
$iconStream.Dispose()
