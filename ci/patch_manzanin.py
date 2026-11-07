#!/usr/bin/env python3
"""Add the complete Adventurer atlas and calmer playback to the recovered site.

Usage: python patch_manzanin.py --project ANDROID_PROJECT_OR_WWW --explorer PNG
Requires Pillow. The PNG is copied unchanged; image processing is analysis only.
"""
from __future__ import annotations

import argparse
from array import array
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
from statistics import median

from PIL import Image

MARKER = "EXPLORER_130_WHOLE_FRAMES"
ASSET = "characters/animated/manzanin-explorer-v130.png"


def analyze(path: Path) -> dict:
    with Image.open(path) as picture:
        if picture.mode != "RGBA":
            raise ValueError("The explorer atlas must have its original RGBA transparency")
        width, height = picture.size
        if width % 4 or height % 3:
            raise ValueError("The explorer atlas must contain four columns and three rows")
        rgba = picture.tobytes()
        alpha = picture.getchannel("A").tobytes()
    cw, ch = width // 4, height // 3
    remaining = bytearray(a > 48 for a in alpha)
    minimum = width * height / 12 * .025
    frames = {}
    for seed in range(width * height):
        if not remaining[seed]:
            continue
        remaining[seed] = 0
        queue = array("I", [seed])
        read = 0
        left, top, right, bottom = width, height, 0, 0
        sum_x = sum_y = 0
        while read < len(queue):
            point = queue[read]
            read += 1
            x, y = point % width, point // width
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            sum_x += x
            sum_y += y
            for yy in range(max(0, y - 1), min(height - 1, y + 1) + 1):
                start = yy * width
                for xx in range(max(0, x - 1), min(width - 1, x + 1) + 1):
                    neighbor = start + xx
                    if remaining[neighbor]:
                        remaining[neighbor] = 0
                        queue.append(neighbor)
        if len(queue) <= minimum:
            continue
        col, row = int(sum_x / len(queue) / cw), int(sum_y / len(queue) / ch)
        key = f"{col},{row}"
        if key in frames:
            raise ValueError(f"Multiple large components occupy explorer cell {key}")
        # Register the apple head, excluding the leaf and the raised hand. Using
        # component membership also excludes disconnected red background noise.
        lines = {}
        for point in queue:
            x, y = point % width, point // width
            ly = y - row * ch
            if not ch * .20 <= ly < ch * .40:
                continue
            at = point * 4
            r, g, b, a = rgba[at:at + 4]
            if a > 80 and r > 115 and r > g * 1.25 and r > b * 1.25:
                lo, hi = lines.get(y, (width, -1))
                lines[y] = (min(lo, x), max(hi, x))
        if not lines:
            raise ValueError(f"Cannot register explorer head in cell {key}")
        widest = max(hi - lo + 1 for lo, hi in lines.values())
        centers = [(lo + hi) / 2 - col * cw for lo, hi in lines.values()
                   if hi - lo + 1 >= widest * .9]
        frames[key] = {
            "cell": key, "area": len(queue),
            "bounds": [left, top, right - left + 1, bottom - top + 1],
            "faceX": round(median(centers), 3),
            "touchesImageEdge": left == 0 or top == 0 or right == width - 1 or bottom == height - 1,
        }
    expected = {f"{col},{row}" for row in range(3) for col in range(4)}
    if set(frames) != expected:
        raise ValueError(f"Expected twelve isolated figures; found {sorted(frames)}")
    ordered = [frames[f"{col},{row}"] for row in range(3) for col in range(4)]
    return {"source": [width, height], "columns": 4, "rows": 3,
            "sha256": sha256(path.read_bytes()).hexdigest(), "frames": ordered,
            "centers": {f["cell"]: f["faceX"] for f in ordered}}


def replace_once(text: str, before: str, after: str) -> str:
    count = text.count(before)
    if count != 1:
        raise ValueError(f"Expected one matching renderer section, found {count}: {before[:90]}")
    return text.replace(before, after, 1)


def patch_source(source: str, analysis: dict) -> str:
    config = {"url": ASSET, "columns": 4, "rows": 3,
              "centers": analysis["centers"],
              "durations": [.8] + [.095] * 10 + [.7]}
    if MARKER in source:
        existing = re.search(r" const explorer130Config=(\{[^\n]+\});", source)
        if not existing or json.loads(existing.group(1)) != config:
            raise ValueError("Renderer contains a different explorer patch; no files have been changed")
        if "if(identity==='deportista')return .5;" not in source or "if(identity==='celebracion')return .53;" not in source:
            raise ValueError("Existing patch has unexpected playback rates")
        return source
    anchor = " for(const [name,config]of Object.entries(preparedSheets))sources[name]=[config.url,config.columns,config.rows];"
    source = replace_once(source, anchor, anchor + "\n // " + MARKER + ": complete figures; no face or body reconstruction.\n const explorer130Config=" + json.dumps(config, ensure_ascii=False, separators=(",", ":")) + ";\n sources.explorer130=[explorer130Config.url,4,3];")
    anchor = " const styleRows={stylesA:['lector','estudioso','artista'],stylesB:['deportista','tecnologico','hidratacion'],stylesC:['explorador','calma','celebracion']};"
    source = replace_once(source, anchor, anchor + "\n faceCenters.explorer130=explorer130Config.centers;")
    source = replace_once(source, "  }else if(preparedSheets[name]){", "  }else if(name==='explorer130'){\n   const keys=Array.from({length:12},(_,i)=>(i%4)+','+Math.floor(i/4));\n   sequences.explorador=make(keys,explorer130Config.durations);\n  }else if(preparedSheets[name]){")
    source = replace_once(source, "['base','actions','faces','waveblink',...Object.keys(preparedSheets)]", "['base','explorer130','actions','faces','waveblink',...Object.keys(preparedSheets).filter(name=>name!=='explorer16')]")
    source = replace_once(source, "defaultFrame=atlases.base?.[base[0]+','+base[1]]", "defaultFrame=identity==='explorador'?undefined:atlases.base?.[base[0]+','+base[1]]")
    source = replace_once(source,
        "  if(!moving)return {frame:defaultFrame,kind:'still',motion:'idle'};",
        """  if(!moving){
   // Pausing keeps the selected figure, including its outfit and objects.
   const sequence=identity==='saludo'?(sequences[motion]||(motion==='idle'?sequences.idle:null)):sequences[identity];
   if(sequence)return {frame:sequence.frames[0],sequence,index:0,within:0,kind:'sequence',motion:identity==='saludo'?motion:'style-'+identity};
   if(identity==='saludo'&&(motion==='run'||motion==='march'))return {frame:atlases.actions?.['0,0']||defaultFrame,kind:'run',motion};
   return {frame:defaultFrame,kind:'still',motion:'idle'};
  }""")
    source = replace_once(source, "if(identity==='deportista')return .75;", "if(identity==='deportista')return .5;")
    source = replace_once(source, "if(identity==='celebracion')return .8;", "if(identity==='celebracion')return .53;")
    source = replace_once(source, "return state.motion==='run'?.75:['dance','celebracion'].includes(state.motion)?.8:1;", "return state.motion==='run'?.5:['dance','celebracion'].includes(state.motion)?.53:1;")
    return source


def find_www(project: Path) -> Path:
    for candidate in [project, project / "app/src/main/assets/www", project / "assets/www", project / "www", project / "site"]:
        if (candidate / "manzanin.js").is_file() and (candidate / "index.html").is_file():
            return candidate
    raise ValueError(f"Cannot find manzanin.js and index.html under {project}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--explorer", type=Path, required=True)
    args = parser.parse_args()
    www = find_www(args.project.resolve())
    explorer = args.explorer.resolve()
    analysis = analyze(explorer)
    renderer_path, index_path = www / "manzanin.js", www / "index.html"
    old_source, index = renderer_path.read_text(), index_path.read_text()
    new_source = patch_source(old_source, analysis)
    pattern = re.compile(r'(<script\b[^>]*\bdata-source=[\"\']manzanin\.js[\"\'][^>]*>)(.*?)(</script\s*>)', re.S | re.I)
    matches = list(pattern.finditer(index))
    if len(matches) != 1:
        raise ValueError(f"Expected one inline manzanin.js block; found {len(matches)}")
    if matches[0].group(2).strip() != old_source.strip():
        raise ValueError("Inline and external mascot renderers differ; synchronize them before patching")
    new_index = pattern.sub(lambda m: m.group(1) + "\n" + new_source.rstrip() + "\n\n" + m.group(3), index)
    # Validate every section before writing either source file.
    destination = www / ASSET
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.resolve() != explorer:
        shutil.copyfile(explorer, destination)
    renderer_path.write_text(new_source)
    index_path.write_text(new_index)
    report_path = www / "manzanin-explorer-v130-analysis.json"
    report_path.write_text(json.dumps(analysis, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"www": str(www), "asset": str(destination), "frames": len(analysis["frames"]),
                      "assetSha256": analysis["sha256"], "runPlaybackRate": .5,
                      "dancePlaybackRate": .53, "inlineRendererUpdated": True,
                      "analysis": str(report_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
