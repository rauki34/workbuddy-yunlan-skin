' WorkBuddy launcher with auto skin injection.
' Point the desktop shortcut at this file. It starts the skin watcher
' (hidden, detached) first, then WorkBuddy. Paths are resolved relative
' to this script and to the current user, so the repo can live anywhere.
Option Explicit

Dim sh, fso, here, node, skin, wb, v
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

here = fso.GetParentFolderName(WScript.ScriptFullName)
skin = here & "\inject.mjs"

' Node: prefer PATH, fall back to WorkBuddy's bundled node.
node = "node"
v = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\.workbuddy\binaries\node\versions"
If fso.FolderExists(v) Then
  Dim f, sub1
  For Each f In fso.GetFolder(v).SubFolders
    If fso.FileExists(f.Path & "\node.exe") Then node = f.Path & "\node.exe"
  Next
End If

' WorkBuddy: common install locations.
wb = "D:\WorkBuddy\WorkBuddy.exe"
If Not fso.FileExists(wb) Then wb = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\WorkBuddy\WorkBuddy.exe"

' 1) watcher: hidden + detached, injects as soon as the debug port is up.
sh.Run """" & node & """ """ & skin & """ --ttl 0", 0, False

' 2) start WorkBuddy
sh.Run """" & wb & """", 1, False
