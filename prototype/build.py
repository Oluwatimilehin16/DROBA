"""Assemble src/ into index.html (open in any browser) and dist/droba-artifact.html (body-only preview build)."""
import pathlib
root = pathlib.Path(__file__).parent
css = (root/'src/styles.css').read_text()
data = (root/'src/data.js').read_text()
app = (root/'src/app.js').read_text()
head = '''<title>Droba</title>
<meta name="description" content="Droba: Nigeria's marketplace for pre-loved fashion.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap">
<style>
''' + css + '''
</style>'''
body = '''<div id="app"></div><div id="layer"></div><div id="jump"></div><div id="toast" aria-live="polite"></div>
<script>
''' + data + '''
</script>
<script>
''' + app + '''
</script>'''
(root/'dist').mkdir(exist_ok=True)
(root/'dist/droba-artifact.html').write_text(head + '\n' + body)
page = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n'
(root/'index.html').write_text(page)
(root.parent/'docs').mkdir(exist_ok=True)
(root.parent/'docs/index.html').write_text(page)  # GitHub Pages serves this folder
(root.parent/'docs/.nojekyll').write_text('')
print('built')
