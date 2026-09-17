# Office items and skill readability

Solo mode changes, based on published 84d2ccf. No publication in this batch.

- Power pickup: 反撃の傘, Canvas umbrella canopy/shaft/curved handle. Guard pickup: 鉄壁ジャケット, sleeves/lapels/buttons. Same existing 8-second effects and rates; instructions updated.
- Shredder orbit radii 48/58/72 -> 76/100/128, hit radius 11 -> 15. Blade art enlarged to 28x20. Existing cooldown and wall checks preserved.
- Replace player drone with 会議打ち切りウェーブ. Internal skill ID drone retained for upgrade tables. No drones or projectiles emitted. A fixed-origin expanding circular wave deals one hit per enemy and knocks back only through a clear strike line. Radius 110/145/180, damage 28/38/50, cooldown 3/2.6/2.2 seconds. Expansion duration .55 sec. Existing boss immovability and brute knockback resistance remain.
- Thunder: initial overhead bolt and landing ring; subsequent chains strike sequentially every .13 sec and display sequence count. Damage occurs with visible strike; targets cannot be duplicated in one cast, dead targets skipped. Visual lifetime .28 -> .65 sec; up to 24 effects. Clear/reset discards pending chains.

Validation: 46 relevant Node tests pass, including 5 new skill tests, existing combat, items/cannon, secret boss, recharge and smog tests. Canvas mock checks finite geometry; not a real browser screenshot. Current local browser environment has previously returned ERR_BLOCKED_BY_CLIENT; actual mobile readability / feel remains unverified.
