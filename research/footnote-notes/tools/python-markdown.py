import sys, markdown
print(markdown.markdown(open(sys.argv[1], encoding='utf-8').read(), extensions=['footnotes', 'tables', 'fenced_code']))
