Original prompt: 請把 puzzle gomoku 連續點擊的特效替換，當連續點了五下，所有的棋子震動一下，當點了十下，所有的棋子掉在地上，五秒後復原。

- Replaced the Gomoku board crack/shatter easter egg with stone-based effects.
- Five consecutive clicks on the same cell now make every placed stone (with move numbers and the last-move star) vibrate once.
- Ten consecutive clicks drop all stones in a left-to-right cascade onto the board's bottom edge, which acts as the floor; stones land with squash-and-stretch bounces, input is blocked, and everything restores five seconds later.
- Restore makes the stones hop back up from the floor to their original points; the effect remains intentionally excluded from saved games.
- `node --check` passes, Gomoku AI tests pass, and no old crack/shatter classes or keyframes remain.
