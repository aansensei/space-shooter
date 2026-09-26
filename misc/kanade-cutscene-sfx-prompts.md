# Kanade cutscene: SFX generation prompts

Prompt cho từng âm thanh của cutscene Timeline Distortion, kèm duration lấy
thẳng từ bảng `BEATS` trong `js/render/kanade-cutscene.js`. Prompt viết bằng
tiếng Anh để đưa thẳng vào công cụ gen (ElevenLabs SFX, Stable Audio, Suno,
AudioGen...).

Format xuất: **mp3**, mono hoặc stereo đều được, đặt trong
`assets/audio/sfx/`, tên file kebab-case giống mọi SFX sẵn có.

**Giới hạn 450 ký tự cho mỗi prompt.** Công cụ gen cắt phần vượt quá, nên mọi
khối trong file này đều được giữ dưới mức đó. Sửa prompt xong thì đếm lại.

## Bảng thời gian thật của cutscene

Tổng: **12400ms**. Mốc tính từ lúc `window._kanadeCutscene` được set.

| Beat | Bắt đầu | Kết thúc | Dài | Chuyện gì xảy ra |
|---|---|---|---|---|
| freeze | 0 | 1200 | 1200 | Sim dừng, màn hình tối lại |
| gate | 1200 | 2100 | 900 | Cổng thực tại xé mở |
| walkOut | 2100 | 4000 | 1900 | Kanade bay ra, mặt hướng về trước |
| think | 4000 | 5800 | 1800 | Đứng nghĩ, bong bóng 3 chấm |
| summon | 5800 | 7100 | 1300 | Vung tay; Goliath spawn thật ở **6515** |
| cast | 7100 | 9500 | 2400 | Stack Overflow áp vào ở **7700**, banner hiện |
| leave | 9500 | 11300 | 1800 | Quay lưng, đi vào cổng |
| close | 11300 | 12400 | 1100 | Cổng đóng, overlay tan, thời gian chạy lại |

Goliath trôi xuống: **6515 đến 9500**, tức **2985ms**.

`freeze` và `close` dài hơn phần còn lại một chút vì chúng là hai đoạn chuyển
cảnh, và cả hai chạy trên quintic smoothstep để mặt sóng không bật lên rồi
dừng phụt. Độ dài các beat ở giữa không đổi, nên mọi SFX vẫn khớp đúng nhịp
của nó, chỉ là mốc phát dời muộn hơn 400ms.

## 1. kanade-time-freeze.mp3

**Duration: 0.8s** (phát ở mốc 0, beat `freeze` dài 1200ms nên đuôi ngân thoải mái)

```
A single sharp moment of time stopping dead. Starts with a bright glass-like
crack, then every surrounding sound is instantly sucked inward and choked off
into silence, like a tape being yanked to a halt. Reverse-swell into the hit,
no tail after it. Cold, crystalline, slightly metallic. Dark ambient / anime
boss-intro sound design. No music, no voice. 0.8 seconds.
```

## 2. kanade-frozen-ambience.mp3 (LOOP, dưới đại dương)

**Duration: 8s, phải loop seamless.** Bắt đầu ở mốc 0, fade out trong beat
`close` (11300 đến 12400).

```
Seamless looping deep underwater ambience for a world where time has
stopped. Heard from far below the surface: a heavy submerged low-pass drone,
a slow water-pressure swell rising and falling, distant muffled whale-like
tones far off in the dark, sparse bubble trails, a soft filtered shimmer
high above like light rippling down through water. Muffled and weightless,
highs rolled off. No rhythm, no melody. Cold and vast. 8 seconds.
```

File trong repo được nâng loudness sau khi nối: boost 7 dB rồi qua limiter
chặn ở 0.63 với `level=disabled`, ra mean -12.7 dB và peak -4.27 dB. Làm ở
file chứ không kéo `SFX_BASE` lên, vì ở mức 1.55 mà file giữ nguyên peak gốc
-2.8 dB thì đã vượt 0 dBFS và méo rồi.

Đây là tầng nền quyết định cảm giác của cả cutscene: thời gian ngưng đọng nghe
như bị nhấn chìm dưới đáy biển, không phải như một căn phòng câm.

Vì thế **mọi SFX khác trong cutscene nên nghe như vọng qua nước**: cắt bớt
tần số cao, đuôi vang dài và mờ, không có tiếng gì gắt hoặc khô. Nếu công cụ
gen không làm được, cứ gen bình thường rồi hạ low-pass khoảng 2 đến 3 kHz và
thêm chút reverb dài khi hậu kỳ.

## 3. kanade-gate-open.mp3

**Duration: 0.9s** (phát ở mốc 1200)

```
A tear opening in reality. Starts as a thin high-pitched slit of static, widens
into a deep resonant portal hum with a rising harmonic sweep, and settles into
a steady otherworldly shimmer at the end. Glassy, dimensional, a bit of
granular texture like space itself being pulled apart. Not explosive, more like
something being unzipped. 0.9 seconds.
```

## 4. kanade-emerge.mp3

**Duration: 1.9s** (phát ở mốc 2100)

```
An elegant figure gliding out of a portal into open space. A soft airy whoosh
with long fabric trailing behind it, layered with delicate crystalline chimes
and a gentle descending shimmer as she settles into place. Weightless, graceful,
no footsteps, no impact. Ends softly with a faint sustained sparkle rather than
a hard stop. Ethereal, feminine, magical. 1.9 seconds.
```

## 5. kanade-think.mp3

**Duration: 1.8s** (phát ở mốc 4000)

```
Quiet thinking. Three soft rounded bell-like blips in a slow steady rhythm,
each slightly higher than the last, with a faint airy shimmer underneath. Very
small and light, like a gentle UI typing indicator rendered in glass. Calm,
curious, unhurried. No bass, no impact, nothing threatening. 1.8 seconds.
```

Nhịp 3 chấm trong game chạy theo `Math.sin(now * 0.006)`, tức khoảng **1
chấm mỗi 0.35s**. Ba blip cách nhau đều trong 1.05s đầu rồi để đuôi ngân là
khớp nhất.

## 6. kanade-summon.mp3

**Duration: 1.3s**, điểm nhấn mạnh nhất phải rơi vào **55% clip (0.715s)**
(phát ở mốc 5800, spawn thật ở 6515)

```
A commanding summoning gesture. A short rising magical charge for the first
half, then a heavy authoritative downbeat at 55 percent of the clip: a deep
resonant boom with a bright golden bell layered on top, like a decree being
issued. Tail rings out with a low ominous swell suggesting something enormous
is now on its way. Regal, imperious, not evil. 1.3 seconds.
```

## 7. goliath-descend.mp3

**Duration: 3.0s** (phát ở mốc 6515, kéo dài tới 9500)

```
Something enormous descending slowly through dead silent air. A continuous low
rumbling drone that builds in weight and pressure across the whole clip, with
grinding metallic armour plates shifting inside it and a faint pressurised
whoosh of displaced air. No impact at the end, it just settles and holds.
Heavy, mechanical, divine, oppressive. 3 seconds.
```

Lưu ý: Goliath đang trôi trong không gian ngưng đọng, nên **không có tiếng
gió thật, không tiếng vật rơi đập đất**. Tất cả phải nghe như bị bóp nghẹt,
bị lọc bớt tần số cao.

## 8. stack-overflow-cast.mp3

**Duration: 2.4s**, điểm nhấn ở **25% clip (0.6s)** (phát ở mốc 7100, effect
áp vào ở 7700)

```
Casting a reality-rewriting spell. A fast rising glassy charge for the first
quarter, then a wide shattering impact at 25 percent of the clip: a chorus of
crystal breaking at once, immediately followed by an endless upward cascade of
ringing tones that keeps climbing and never resolves, like a counter overflowing
past its limit. Tail is a long unstable shimmer that refuses to settle. Violet,
glitchy, mathematical, slightly wrong. 2.4 seconds.
```

## 9. timeline-distortion-banner.mp3

**Duration: 1.2s** (phát ở mốc 7700, cùng lúc banner hiện)

```
A short announcement stinger for a boss modifier appearing on screen. One deep
impactful hit with a bright metallic ring on top, then a quick reversed
shimmer that resolves into a clean sustained tone. Reads as a title card
landing. Grand but brief, no melody. 1.2 seconds.
```

Tách riêng khỏi `stack-overflow-cast` để sau này thêm effect mới vào pool thì
banner vẫn dùng chung một stinger, chỉ đổi tiếng cast.

## 10. kanade-depart.mp3

**Duration: 1.8s** (phát ở mốc 9500)

```
An elegant figure turning away and walking back into a portal. A soft turn with
trailing fabric, then a gentle airy pull as she is drawn inward, with delicate
chimes thinning out and fading into distance as if she is moving away from the
listener. Ends almost silent. Graceful, final, unhurried. 1.8 seconds.
```

## 11. kanade-time-resume.mp3

**Duration: 0.7s** (phát ở mốc 11300)

```
Time starting again. A portal snapping shut with a soft glassy clap, then the
world rushing back in: a quick reverse-choked swell that opens up into full
bright air, like a vacuum being released. Short, clean, relieving. The opposite
gesture of a freeze. 0.7 seconds.
```

## 12. kanade-collapse-loop.mp3 (LOOP, vạn vật sụp đổ)

**Duration: 8s khi gen, phải loop seamless.** Lớp thứ hai chồng lên
`kanade-frozen-ambience.mp3`, không thay thế nó. File trong repo dài 10s vì
đã được kéo chậm lại, xem ghi chú bên dưới.

```
Seamless looping ambience of a world breaking apart. Stone and glass
fracturing: dry hairline cracks racing outward, deep structural groans,
crystalline splinters snapping off one after another, rubble grinding far
below. The cracking never resolves, arriving in uneven clusters, never on a
beat. Under it a subsonic rumble of collapse that swells and recedes. Heard
through water: highs rolled off, muffled tails. No music, no voices.
8 seconds.
```

Lưu tại:

```
C:\Users\Thien An Nguyen\SpaceShooter\assets\audio\sfx\kanade-collapse-loop.mp3
```

Ý đồ: `kanade-frozen-ambience` lo phần **tĩnh** (thời gian đã dừng, chìm dưới
nước), file này lo phần **động** (thực tại đang chịu không nổi và nứt dần).
Hai lớp chạy song song nghe sẽ đầy hơn hẳn một lớp.

**Đã có file và đã wire.** Dựng từ hai bản gen độc lập cùng prompt này, trộn
chồng lên nhau (không phải nối tiếp) để tiếng nứt dày đặc hơn: bản mỏng hơn
được nâng 8 dB rồi mix, qua limiter chặn ở 0.71 với `level=disabled` để chừa
chỗ cho phần vọt lên khi encode mp3. Kết quả 8.00s, peak -0.58 dB,
mean -16.1 dB, ngang mức lớp ambience.

Mức phát: vào từ mốc 0 cùng tiếng nền ở **0.5**, dâng lên **1.0** trong 900ms
kể từ lúc Stack Overflow áp vào (mốc **7700**), vì đó đúng là lúc các giới hạn
của thế giới bị gỡ bỏ, rồi fade về 0 cùng lớp ambience trong beat `close`.
Điều khiển nằm ở `driveCutsceneBed` trong `js/render/kanade-cutscene.js`.

Sau khi trộn, bản mix được cho chạy ở **0.8x** bằng `asetrate` rồi resample
về 48kHz. Đây là kéo chậm kiểu tua băng nên cao độ tụt theo khoảng 3.9 nửa
cung: tiếng nứt nghe nặng và to hơn, hợp với thứ đang sụp đổ hơn là giữ
nguyên cao độ. Độ dài thành 10.00s, vẫn seamless vì cả vòng lặp bị kéo đều.
Muốn giữ nguyên cao độ thì thay `asetrate` bằng `atempo=0.8`, đổi lại là
`atempo` dùng phase vocoder nên dễ làm nhòe các transient sắc như tiếng crack.

Muốn gen lại thì giữ đúng 8 giây và seamless.

## Cách wire vào game

Mọi SFX của cutscene đều **bypass cổng đóng băng**, vì
`AudioMgr.setTimeFrozen(true)` chặn `playSfx` / `playSfxAt` / `startLoop`
trong suốt cutscene (đó chính là thứ giữ cho mọi âm thanh khác im lặng).

`js/audio.js` có sẵn đường riêng cho việc này: `playCutsceneSfx(key)` cho
one-shot, và `startCutsceneAmbience` / `setCutsceneAmbienceGain` /
`stopCutsceneAmbience` cho tiếng nền. Không hàm nào trong số đó đọc
`_timeFrozen`. Mười one-shot đăng ký qua `_makePool(key, src, 1, true)` và
tiếng nền tạo bằng `_makeBufferLoop(true)`, tức cả hai đều đi `_bypassGain`
chứ không qua duck chain, nên một duck đang bật lúc Kanade ngưng thời gian
(nặng nhất là `lowhp`, còn 0.16 gain kèm lowpass 260Hz) không bóp được chúng.

Điểm phát nằm trong `js/render/kanade-cutscene.js`, ở bảng `CUES`: đọc theo
mốc elapsed tuyệt đối với một con trỏ, nên một frame bị drop không nuốt mất
tiếng. Cue trễ quá `CUE_LATE_MS` thì bỏ qua chứ không phát chồng lên nhịp sau.

Mỗi file mới phải thêm vào danh sách precache trong `js/offline.js`, kèm bump
`?v=` của các file js đã sửa trong `index.html` và `CACHE_VERSION` trong
`sw.js`.

Tiếng nền là **hai lớp** chạy song song: `state.kanadeAmbienceEl` lo phần
tĩnh, `state.kanadeCollapseEl` lo phần sụp đổ. Cả hai tạo bằng
`_makeBufferLoop(true)`, bật cùng lúc trong `startCutsceneAmbience`, và trộn
mỗi frame qua `setCutsceneBedGains(ambMul, collapseMul)` để lớp sụp đổ dâng
lên được mà lớp ambience vẫn giữ nguyên mức.
