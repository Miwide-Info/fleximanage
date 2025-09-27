param([int]$targetPid)
try {
    $p = Get-Process -Id $targetPid -ErrorAction Stop
    $pth = ""
    try { $pth = $p.Path } catch { $pth = "" }
    if ($null -eq $pth) { $pth = "" }
    $nm = $p.ProcessName
    $pth = $pth -replace '"',''
    Write-Output ("{0}|{1}" -f $nm, $pth)
} catch {
    Write-Output ""
}
