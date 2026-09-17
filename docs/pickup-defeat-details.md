# Speed pickup and defeat details

- Speed pickup is 加速タバコ with a white cigarette, tan filter, orange ember and smoke drawn in Canvas. Effect remains 1.35x movement for 8 seconds.
- Solo defeat screen identifies the enemy, attack and final incoming damage after reductions, plus energy immediately before defeat.
- Projectiles and delayed areas retain source names even if their source enemy disappears.
- Fatal hit is retained against subsequent same-frame collisions. Retry resets it; timeout has its own explanation.
- Includes preceding unpublished office item / skill refresh changes.

Validation: 51 targeted Node tests passed (defeat-details, skill-refresh, game, field-items, ultimate-recharge, ultimate-mob-balance, secret-boss). Includes actual projectile collision after attacker removal, delayed area collision, reduced damage, fatal record preservation, reset and timeout.
Browser verification remains unavailable: this environment blocks local preview navigation with ERR_BLOCKED_BY_CLIENT. No claim of smartphone or visual verification.
Not deployed. Work branch only; main is unchanged.
