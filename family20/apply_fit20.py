#!/usr/bin/env python3
"""Append height-aware family sizing without rewriting any auth or app scripts."""
import re
import sys
from pathlib import Path
project=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/manzanin-notificaciones/AppSchooling_AndroidStudio_2_0')
www=project/'app/src/main/assets/www'
css=(Path(__file__).with_name('fit20.css')).read_text()
(www/'fit20.css').write_text(css)
p=www/'index.html';text=p.read_text()
style='<style data-source="fit20.css">\n'+css+'</style>\n'
if re.search(r'<style data-source="fit20.css">[\s\S]*?</style>\n?',text):
 text=re.sub(r'<style data-source="fit20.css">[\s\S]*?</style>\n?',lambda m:style,text)
else:
 assert '</head>' in text
 text=text.replace('</head>',style+'</head>',1)
p.write_text(text)
