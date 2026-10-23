$sig = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Z {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", EntryPoint="GetWindowLong")] public static extern int GetWindowLong32(IntPtr h, int i);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")] public static extern IntPtr GetWindowLongPtr64(IntPtr h, int i);
  public static int ExStyle(IntPtr h) { return IntPtr.Size == 8 ? GetWindowLongPtr64(h, -20).ToInt32() : GetWindowLong32(h, -20); }
}
'@
Add-Type -TypeDefinition $sig
$script:out = @()
$cb = { param($h, $l)
  if ([Z]::IsWindowVisible($h)) {
    $sb = New-Object System.Text.StringBuilder 256
    [void][Z]::GetWindowText($h, $sb, 256)
    $t = $sb.ToString()
    if ($t -eq '') { $t = '<no-title>' }
    $ex = [Z]::ExStyle($h)
    $script:out += ('{0}|{1}|topmost={2}' -f $h.ToString('X'), $t, [bool]($ex -band 0x8))
  }
  return $true
}
[void][Z]::EnumWindows($cb, [IntPtr]::Zero)
$script:out | Set-Content "$env:TEMP\zorder.txt" -Encoding UTF8