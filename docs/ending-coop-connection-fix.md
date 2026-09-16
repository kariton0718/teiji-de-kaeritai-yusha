# Ending / co-op connection repair

- Fix true-ending square atlas: image was in normal flow, so left/top quadrant offsets did not apply. Set position:absolute in square-sheet images. Existing normal ending styles unchanged.
- Waiting host retains invitation and retries signaling reconnection up to three times after suspension. Returning to page requests reconnection immediately. Active-game hidden-page termination remains unchanged.
- Initial connection timeout 20 -> 45 seconds; accepted guest handshake 15 -> 30 seconds.
- Add error categories (peer-unavailable, peer-link, signaling, etc.) and retry button. Guest retry preserves invite; host retry creates a fresh room/invite.
- Still no TURN relay. Direct WebRTC may fail across some networks. The user's exact failure has not been reproduced; these changes do not establish that all connection failures are resolved.

Validation: node --test tests/coop.test.js tests/true-ending.test.js tests/coop-playthrough.test.js: 21 pass, including simulated signaling recovery and 3 input-only full co-op runs.
Browser verification attempted on localhost: blocked by browser environment ERR_BLOCKED_BY_CLIENT. No real-device verification claimed.
