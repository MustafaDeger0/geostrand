"""Check the built R8 release, its bridge entry points and packaged web assets."""
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "android/app/build/outputs"
REPORT = BUILD / "r8-verification"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def dex_bytes(archive):
    return sum(len(archive.read(name)) for name in archive.namelist()
               if re.search(r"(?:^|/)classes\d*\.dex$", name))


def main():
    mapping_path = BUILD / "mapping/release/mapping.txt"
    config_path = BUILD / "mapping/release/configuration.txt"
    require(mapping_path.is_file(), "R8 mapping.txt missing")
    require(config_path.is_file(), "R8 configuration.txt missing")
    mapping = mapping_path.read_text(encoding="utf-8")
    config = config_path.read_text(encoding="utf-8")
    require(mapping.strip(), "R8 mapping is empty")
    for flag in ("-dontoptimize", "-dontobfuscate", "-dontshrink"):
        require(not re.search(r"(?m)^\s*" + re.escape(flag) + r"\s*$", config),
                "Release optimization disabled by " + flag)

    class_maps = dict(re.findall(r"(?m)^(\S+) -> (\S+):$", mapping))
    renamed = sum(before != after for before, after in class_maps.items())
    require(renamed > 0, "No classes were obfuscated")

    aab_path = BUILD / "bundle/release/app-release.aab"
    debug_path = BUILD / "apk/debug/app-debug.apk"
    release_paths = list((BUILD / "apk/release").glob("app-release*.apk"))
    require(len(release_paths) == 1, "Expected one release APK")
    REPORT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(aab_path) as bundle, \
         zipfile.ZipFile(debug_path) as debug, \
         zipfile.ZipFile(release_paths[0]) as release:
        debug_dex = dex_bytes(debug)
        release_dex = dex_bytes(release)
        bundle_dex = dex_bytes(bundle)
        require(debug_dex > 0 and release_dex > 0 and bundle_dex > 0, "DEX missing")
        require(release_dex < debug_dex, "R8 did not reduce DEX size versus debug")
        dex = b"".join(bundle.read(name) for name in bundle.namelist()
                       if re.search(r"(?:^|/)classes\d*\.dex$", name))
        # Capacitor discovers these classes from JSON, so their names must survive.
        plugins = json.loads(bundle.read("base/assets/capacitor.plugins.json"))
        require(plugins, "Capacitor plugin registry is empty")
        names = [plugin["classpath"] for plugin in plugins]
        for name in names:
            require(class_maps.get(name) == name, "Plugin renamed or stripped: " + name)
            descriptor = ("L" + name.replace(".", "/") + ";").encode()
            require(descriptor in dex, "Plugin descriptor missing: " + name)
        for annotation in ("com.getcapacitor.annotation.CapacitorPlugin",
                           "com.getcapacitor.PluginMethod"):
            require(class_maps.get(annotation) == annotation,
                    "Runtime annotation renamed or stripped: " + annotation)
        handler = re.search(
            r"(?m)^com\.getcapacitor\.MessageHandler -> \S+:\n((?:[ \t].*\n|#.*\n)*)", mapping)
        require(handler is not None, "WebView message handler missing")
        require(re.search(r"\bpostMessage\(.*-> postMessage\s*$",
                          handler.group(1), re.MULTILINE),
                "WebView JavaScript bridge method was removed or renamed")
        for asset in ("index.html", "js/main.js", "js/core/Native.js",
                      "js/ui/PlayerHub.js", "css/style.css"):
            require("base/assets/public/" + asset in bundle.namelist(),
                    "Game asset missing: " + asset)
        metadata = "BUNDLE-METADATA/com.android.tools/r8.json"
        has_metadata = metadata in bundle.namelist()
        if has_metadata:
            (REPORT / "r8.json").write_bytes(bundle.read(metadata))
        summary = {
            "debug_dex_bytes": debug_dex,
            "release_dex_bytes": release_dex,
            "bundle_dex_bytes": bundle_dex,
            "dex_reduction_vs_debug_percent": round((1 - release_dex / debug_dex) * 100, 2),
            "mapped_classes": len(class_maps),
            "renamed_classes": renamed,
            "verified_plugins": names,
            "r8_metadata_in_bundle": has_metadata,
            "note": "DEX size reduction versus debug is not the Play Console optimization score.",
        }
    (REPORT / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
