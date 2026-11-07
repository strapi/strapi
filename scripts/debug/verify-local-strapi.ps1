# Run against YOUR Strapi project (default http://localhost:1337)
# Usage: .\verify-local-strapi.ps1
# Writes debug-ab0d43.log in current directory

$BaseUrl = if ($env:STRAPI_URL) { $env:STRAPI_URL } else { "http://localhost:1337" }
$LogPath = Join-Path (Get-Location) "debug-ab0d43.log"

function Write-Log($message, $data, $hypothesisId, $runId = "user-verify") {
  $entry = @{
    sessionId = "ab0d43"
    location = "verify-local-strapi.ps1"
    message = $message
    data = $data
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    hypothesisId = $hypothesisId
    runId = $runId
  } | ConvertTo-Json -Compress
  Add-Content -Path $LogPath -Value $entry
  Write-Host "[$hypothesisId] $message" -ForegroundColor Cyan
  $data | Format-List
}

if (Test-Path $LogPath) { Remove-Item $LogPath }

Write-Host "Verifying Strapi at $BaseUrl" -ForegroundColor Green

# H1: Team API permissions
try {
  $teams = Invoke-RestMethod -Uri "$BaseUrl/api/teams" -Method Get -ErrorAction Stop
  Write-Log "GET /api/teams" @{ status = 200; count = $teams.data.Count } "H1" "post-fix"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Log "GET /api/teams" @{ status = $status; error = $_.Exception.Message } "H1"
}

# H2-H5: Page dynamic zone with v5 populate
$populate = [uri]::EscapeDataString("populate[dynamic_zone][on][dynamic-zone.team][populate][teams]=true")
try {
  $pages = Invoke-RestMethod -Uri "$BaseUrl/api/pages?$populate" -Method Get -ErrorAction Stop
  $dz = $pages.data[0].dynamic_zone
  $teamBlock = $dz | Where-Object { $_.__component -eq "dynamic-zone.team" }
  Write-Log "GET /api/pages with DZ populate" @{
    status = 200
    pageCount = $pages.data.Count
    dzLength = $dz.Count
    hasTeamBlock = ($null -ne $teamBlock)
    teamBlock = $teamBlock
  } "H2-H5"
} catch {
  $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "error" }
  Write-Log "GET /api/pages" @{ status = $status; error = $_.Exception.Message } "H2-H5"
}

Write-Host "`nLog written to: $LogPath" -ForegroundColor Green
Write-Host "Share this file if the issue persists." -ForegroundColor Yellow
