$css = Get-Content "css\feed.css" -Raw

$css = $css -replace '(?ms)^\s*\.topbar\.is-searching[^{]*\{[^}]*\}\s*', ''

$css += @'

/* ============================================================
   SKILLME2 - TOPBAR SEARCHING STATE (mobile only)
   ============================================================ */
@media (max-width: 768px) {
  .topbar.is-searching .topbar__center {
    flex: 1 1 auto;
    max-width: none;
    opacity: 1;
    pointer-events: auto;
    margin: 0 0.35rem;
  }
  .topbar.is-searching .topbar__wordmark {
    max-width: 0;
    opacity: 0;
  }
}
'@

Set-Content -Path "css\feed.css" -Value $css -NoNewline -Encoding UTF8
Write-Host "Cleaned css/feed.css - only mobile .is-searching rules remain." -ForegroundColor Green

Write-Host ""
Write-Host "Remaining .is-searching occurrences:" -ForegroundColor Cyan
Select-String -Path "css\feed.css" -Pattern "is-searching" | Select-Object LineNumber, Line