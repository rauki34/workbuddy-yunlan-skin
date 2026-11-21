' WorkBuddy launcher with auto skin injection.
' Point the desktop shortcut at this file. Starts the skin watcher (hidden,
' detached) first, then WorkBuddy. All paths resolve relative to this script
' or the current user, so renaming/moving the project folder is safe.
' The watcher failing must never prevent WorkBuddy from starting.
Option Explicit

Dim sh, fso, here, node, skin, wb, v, f
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' --- skin script lives next to this launcher ---
here = fso.GetParentFolderName(WScript.ScriptFullName)
skin = here & "\inject.mjs"

' --- node: PATH first, then the newest bundled version ---
node = "node"
v = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\.workbuddy\binaries\node\versions"
If fso.FolderExists(v) Then
  Dim sub1
  For Each sub1 In fso.GetFolder(v).SubFolders
    If fso.FileExists(sub1.Path & "\node.exe") Then node = sub1.Path & "\node.exe"
  Next
End If

' --- WorkBuddy install ---
wb = "D:\WorkBuddy\WorkBuddy.exe"
If Not fso.FileExists(wb) Then
  wb = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\WorkBuddy\WorkBuddy.exe"
End If

' 1) watcher: hidden + detached; any failure is ignored on purpose
If fso.FileExists(skin) Then
  On Error Resume Next
  sh.Run """" & node & """ """ & skin & """ --ttl 0", 0, False
  On Error GoTo 0
End If

' 2) start WorkBuddy regardless of what happened above
If fso.FileExists(wb) Then
  sh.Run """" & wb & """", 1, False
Else
  MsgBox "WorkBuddy.exe not found:" & vbCrLf & wb, 48, "WorkBuddy"
End If
