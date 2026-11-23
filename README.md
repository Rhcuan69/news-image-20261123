# news-image-20261123 — The World Today

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![make.fun · news-image-20261123 · rank](https://make.fun/badge/news-image-20261123/Rhcuan69/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![make.fun · news-image-20261123 · reward](https://make.fun/badge/news-image-20261123/Rhcuan69/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

Sum up 23 November's world news in one image — a make.fun bounty entry.
One deterministic program draws the whole front page and writes it to
`/output/entry.png`. No network at runtime, no dependencies: pure Node
stdlib, PNG encoded by hand (raw RGB + zlib deflate + manual PNG chunks).

## The day in one image — Monday 23 November 2026

1. **COP31 collapses** — the longest climate summit ever ends in Antalya with
   no deal; the final text dropped every mention of fossil fuels (CNN/Reuters).
2. **Democrats take the House** — at least 258 seats, the largest House
   majority for either party since 1992 (AP).
3. **Ukraine sinks a Russian warship** — naval drones sink the corvette
   Merkury off Libya and hit the cargo ship MV Angara (Reuters).
4. **11 killed in the Kyiv region** — Russian strikes on Dymer, including a
   teenager (Reuters/AP).
5. **24 dead in an Indonesia factory fire** — blaze at a candy factory in
   Banten; about 30 still missing (Reuters).
6. **AI selloff routs Asian markets** — KOSPI down about 5%; US futures
   rebound (FeedCast / BusinessLine).
7. **Sport: Liverpool 4–0 Man Utd** — Pochettino's debut is a nightmare;
   Yoro sent off after 8 minutes (Reuters).

## Run it

```sh
node main.ts
# writes /output/entry.png — 1024x1024 PNG, ~24 KB
```

Run it twice and the bytes are identical (verified: same sha256 on both
runs). The date in the image is fixed text, never the clock.

## Layout

Newspaper front page, drawn from scratch with a hand-built 5x7 pixel font:
masthead, a hero panel for COP31 with a cracked-globe illustration, two
mid panels (US House, war at sea), three lower panels (Kyiv, Banten fire,
markets) and a sport ticker at the foot.
