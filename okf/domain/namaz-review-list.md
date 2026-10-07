---
type: review-list
title: "Namaz Content Review List"
description: "Every generated Namaz item (transliteration, action text) awaiting teacher approval, plus image follow-ups."
status: draft
verified: false
sources:
  - "supabase/migration_namaz_guidance.sql"
  - "src/app/namaz/audio/page.tsx"
tags:
  - namaz
  - review
---

# Namaz Content Review List

Seeded by `migration_namaz_guidance.sql`. Every part below has `needs_review = true` until the teacher approves it on **/namaz/audio → Needs review**. The Arabic and English meanings were **not** changed.

**Legend:** ✍️ = transliteration written by Claude (not from the provided list) · every action text was written by Claude.

## Parts

| Step | Part | Transliteration (chips separated by ·) | Action text | Check |
|---|---|---|---|---|
| Takbir | Takbir | Allahu · Akbar | Raise both hands to your ears. | Check action text. |
| Qiyam | Sana | Subhanaka · Allahumma · wa bihamdika · wa tabaraka · smuka · wa ta'ala · jadduka · wa la · ilaha · ghayruk | Stand still, hands folded. Say it quietly. | Check action text. |
| Qiyam | Al-Fatiha | Bismil- · lahir- · Rahmanir- · Rahim · Al-hamdu · lillahi · Rabbil- · 'alamin · Ar-Rahmanir- · Rahim · Maliki · yawmid- · din · Iyyaka · na'budu · wa iyyaka · nasta'in · Ihdinas- · siratal- · mustaqim · Siratal- · ladhina · an'amta · 'alayhim · ghayril- · maghdubi · 'alayhim · wa lad- · dallin | Keep standing. Recite Al-Fatiha. | Check action text and how the words are split into chips. |
| Qiyam | Al-Ikhlas | Qul · huwa · Allahu · ahad · Allahus- · samad · Lam · yalid · wa lam · yulad · Wa lam · yakul- · lahu · kufuwan · ahad | Still standing, recite a short surah. | Check action text and how the words are split into chips. |
| Ruku | Subhana Rabbiyal Azeem (×3) | Subhana · Rabbiyal- · 'Azim | Bow down. Hands on knees. Back flat. | Check action text. |
| Qawmah | Sami Allah | Sami' · Allahu · liman · hamidah | Rise up straight from bowing. | Check action text. |
| Qawmah | Rabbana wa lakal Hamd | ✍️ Rabbana · wa lakal- · hamdu · hamdan · kathiran · tayyiban · mubarakan · fih | Stand tall, arms by your sides. | Transliteration written by Claude: the stored Arabic is longer than 'Rabbana lakal-hamd'. Check it, and the action text. |
| Sujood | Subhana Rabbiyal A'la (×3) | Subhana · Rabbiyal- · A'la | Forehead, nose, hands, knees and toes on the ground. | Check action text. |
| Jalsa | Dua | ✍️ Allahumma · ghfir · li · warhamni · wahdini · wa'afini · warzuqni | Sit up calmly between the two sujood. | Transliteration written by Claude. Check it, and the action text. |
| Second Sujood | Subhana Rabbiyal A'la (×3) | Subhana · Rabbiyal- · A'la | Go down into sujood again. | Check action text. |
| Tashahhud | Atahiyatu | At-tahiyyatu · lillahi · was-salawatu · wat-tayyibat · as-salamu · 'alayka · ayyuhan- · Nabiyyu · wa rahmatul- · lahi · wa barakatuh · as-salamu · 'alayna · wa 'ala · 'ibadil- · lahis- · salihin · ash-hadu · an · la · ilaha · illal- · lah · wa ash-hadu · anna · Muhammadan · 'abduhu · wa rasuluh | Sit calmly, hands resting on your thighs. | Check action text and how the words are split into chips. |
| Tashahhud | Durood-e-Pak | ✍️ Allahumma · salli · 'ala · Muhammadin · wa 'ala · ali · Muhammadin · kama · sallayta · 'ala · Ibrahima · wa 'ala · ali · Ibrahima · innaka · Hamidun · Majid · Allahumma · barik · 'ala · Muhammadin · wa 'ala · ali · Muhammadin · kama · barakta · 'ala · Ibrahima · wa 'ala · ali · Ibrahima · innaka · Hamidun · Majid | Keep sitting. Send blessings on the Prophet ﷺ. | Transliteration written by Claude. Check it, and the action text. |
| Tashahhud | Last dua | ✍️ Allahumma · inni · zalamtu · nafsi · zulman · kathiran · wa la · yaghfirudh- · dhunuba · illa · anta · faghfir · li · maghfiratan · min · 'indika · warhamni · innaka · antal- · Ghafurur- · Rahim | Keep sitting and make this dua. | Transliteration written by Claude. Check it, and the action text. |
| Salam | Assalamu Alaikum | As-salamu · 'alaykum · wa rahmatul- · lah | Turn your head to the right, then the left. | Check action text. |

## Spelling fixes applied

* Ruku part title: "Subhana Rabi Yal Azeem" → **"Subhana Rabbiyal Azeem"**
* Sujood and Second Sujood part titles: "Subhana Rabi Yal Ala" → **"Subhana Rabbiyal A'la"**

## Notes for the teacher

* **Qawmah, "Rabbana wa lakal Hamd":** the stored Arabic is the longer form (*…hamdan kathiran tayyiban mubarakan fih*), so the transliteration follows the Arabic rather than the short "Rabbana lakal-hamd".
* Chips use a trailing hyphen where a word joins the next in speech (*Bismil- lahir- Rahmanir- Rahim*).

## Images

* [ ] **Replace Takbir image to match the sketch style.** Takbir is a colour illustration; every other posture is a pencil sketch. Not fixed in code.
