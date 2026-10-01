p = 'src/scenes/orman.ts'
s = open(p, encoding='utf8').read()
old = """    th(57, 59.4); rock(60.3, 0.55); th(61.2, 63.6); rock(64.6, 0.62); th(65.6, 67.8);
    log(62.0, 1.0, 1.15); // yüksek kütük (dikenlerin üstünde basamak)"""
assert old in s
s = s.replace(old, """    th(57, 58.6); rock(59.5, 0.62); th(60.4, 62.0); th(63.7, 65.3); rock(66.2, 0.66); th(67.2, 68.4);
    log(62.35, 1.1, 1.0); // yüksek kütük (dikenlerin arasında basamak)""")
open(p, 'w', encoding='utf8').write(s)
p = 'tools/senaryolar/bot.mjs'
s = open(p, encoding='utf8').read()
s = s.replace("c.hazard && c.enabled && c.x0 < pl.x + 1.25 && c.x1 > pl.x + 0.25", "c.hazard && c.enabled && c.x0 < pl.x + 0.8 && c.x1 > pl.x + 0.2")
open(p, 'w', encoding='utf8').write(s)
print('tamam')
