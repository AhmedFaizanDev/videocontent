# Variables & Constants — Explainer Script

- **Channel:** ZSkillup
- **Audience:** Absolute beginners (zero coding background)
- **Target length:** ~3:00 · ~390 narrated words @ ~140 wpm
- **Language:** English
- Each scene's narration below is the exact text sent to ElevenLabs. On-screen
  timing is driven by the measured duration of each scene's audio file.

---

## Scene 1 — Hook (~7s)

**Visual:** Kinetic question typography; phone mockup remembers a typed name and greets the user.

**Narration:**
> Here's a question: when an app remembers your name… where does it actually put it?

---

## Scene 2 — What is a variable? (~32s)

**Visual:** "Variable" title; a named memory cell appears — label + value; value gets swapped to prove it can change; three chips stagger in: NAME · VALUE · CAN CHANGE.

**Narration:**
> Every program needs to remember things — your score in a game, the items in your cart, the name you just typed in. A variable is how a program remembers. It's a named piece of the computer's memory that holds a value. And as the name suggests, that value can vary — it can change while the program runs. You give it a name, you put something inside, and you can swap that something at any time.

---

## Scene 3 — The labeled box analogy (~36s)

**Visual:** A labeled box ("score") — token "10" drops in, gets ejected, "50" drops in. Beside it, a locking box with a padlock — value goes in, lid shuts, lock clicks; an attempted swap bounces off.

**Narration:**
> Think of a variable as a labeled box. The label is the name, and whatever sits inside is the value. A box labeled "score" might hold ten right now. Play one round, and the program takes the ten out and drops in a fifty. Same box, same label — new contents. A constant is a different kind of box. Once you put a value in and shut the lid, it locks. Nobody can swap what's inside. The program can only look at it.

---

## Scene 4 — Real code (~52s)

**Visual:** Editor window; JavaScript types out line-by-line with syntax colors, labels point at keyword / name / value; reassignment highlights; the `const` reassignment triggers a red shake + real error message.

**On-screen code:**
```js
let score = 10;
score = 50;        // same box, new value

const PI = 3.14159;
PI = 3.2;          // ❌ TypeError!
```

**Narration:**
> Here's what that looks like in real code — this is JavaScript. "Let score equal ten" creates a variable. The word "let" tells the computer: make me a box. "Score" is the label, and ten goes inside. Later we write "score equals fifty" — no "let" this time, because the box already exists. We're simply replacing its contents. Now the constant: "const PI equals 3.14159". "Const" is short for constant, and it works the same way — one name, one value — with one big exception. If you try to change it, the program stops and throws an error. That's not the computer being difficult. That's protection you asked for.

---

## Scene 5 — Which one do you use? (~31s)

**Visual:** Split comparison — amber "Variable" card (score, timer, username) vs teal "Constant" card (days in a week, tax rate, app name); center question "Will it change?"; pro-tip banner slides in.

**Narration:**
> So choosing between them comes down to one question: will this value ever need to change? A score, a countdown, a username someone might edit — those change, so use a variable. The days in a week, a tax rate, your app's name — those should never change, so use a constant. And here's a habit professionals swear by: reach for a constant first, and only switch to a variable when something truly needs to change.

---

## Scene 6 — Recap & takeaway (~22s)

**Visual:** Kinetic one-liner recap with the two box icons; ZSkillup logo outro.

**Narration:**
> One line to remember: variables are labeled boxes you can refill; constants are boxes that lock. Name your data, protect what shouldn't change — and you've just learned the first real building block of every program ever written. See you in the next one.
