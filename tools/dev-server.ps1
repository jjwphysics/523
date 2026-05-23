param(
  [int]$Port = 5173,
  [string]$Root = (Get-Location).Path
)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$listener.Start()

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $requestLine = $reader.ReadLine()

    if (-not $requestLine) {
      $client.Close()
      continue
    }

    $parts = $requestLine.Split(" ")
    $path = [Uri]::UnescapeDataString($parts[1]).TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = "index.html"
    }

    $localPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $path.Replace("/", [System.IO.Path]::DirectorySeparatorChar)))
    $rootPath = [System.IO.Path]::GetFullPath($Root)

    while ($reader.Peek() -gt -1) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrEmpty($line)) { break }
    }

    if (-not $localPath.StartsWith($rootPath) -or -not [System.IO.File]::Exists($localPath)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
      $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Write($body, 0, $body.Length)
      $client.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($localPath).ToLowerInvariant()
    $type = switch ($ext) {
      ".html" { "text/html; charset=utf-8" }
      ".css" { "text/css; charset=utf-8" }
      ".js" { "application/javascript; charset=utf-8" }
      ".png" { "image/png" }
      ".jpg" { "image/jpeg" }
      ".jpeg" { "image/jpeg" }
      ".mp3" { "audio/mpeg" }
      ".ogg" { "audio/ogg" }
      default { "application/octet-stream" }
    }

    $body = [System.IO.File]::ReadAllBytes($localPath)
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Write($body, 0, $body.Length)
    $client.Close()
  }
}
finally {
  $listener.Stop()
}
