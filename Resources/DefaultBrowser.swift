import CoreServices
import Foundation

let chromeBundleID = "com.google.Chrome" as CFString
let requestedMode = CommandLine.arguments.dropFirst().first
guard requestedMode == "--check" || requestedMode == "--set" else {
    fputs("Use --check (read only) or --set.\n", stderr)
    exit(2)
}
var writeFailed = false
if requestedMode == "--set" {
    for scheme in ["http", "https"] {
        if LSSetDefaultHandlerForURLScheme(scheme as CFString, chromeBundleID) != noErr {
            writeFailed = true
        }
    }
    if LSSetDefaultRoleHandlerForContentType("public.html" as CFString, .all, chromeBundleID) != noErr {
        writeFailed = true
    }
}
let handlers: [(String, String)] = [
    ("http", LSCopyDefaultHandlerForURLScheme("http" as CFString)?.takeRetainedValue() as String? ?? "unknown"),
    ("https", LSCopyDefaultHandlerForURLScheme("https" as CFString)?.takeRetainedValue() as String? ?? "unknown"),
    ("html", LSCopyDefaultRoleHandlerForContentType("public.html" as CFString, .all)?.takeRetainedValue() as String? ?? "unknown")
]
let matched = handlers.allSatisfy { $0.1 == chromeBundleID as String }
if matched && !writeFailed {
    print("Chrome")
    exit(0)
}
print(handlers.map { "\($0.0)=\($0.1)" }.joined(separator: "; "))
exit(1)
