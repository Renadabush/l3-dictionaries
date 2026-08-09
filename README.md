<div align="center">

# 🧩 L3 Dictionaries & L2 → JavaScript Translator

### PPL252 — Assignment 2 · Questions 2 & 3

*A hands-on exploration of interpreters, syntax extension, and code translation in TypeScript*

[![Language](https://img.shields.io/badge/language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Runtime](https://img.shields.io/badge/tests-npm%20test-CB3837?style=for-the-badge&logo=npm&logoColor=white)](#-running-the-tests)
[![Course](https://img.shields.io/badge/course-PPL252-6E56CF?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/status-complete-2EA44F?style=for-the-badge)](#)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Question 2 — Adding Dictionaries to L3](#-question-2--adding-dictionaries-to-l3)
  - [2.1 Dictionaries as Primitive Operators](#21-dictionaries-as-primitive-operators)
  - [2.2 Dictionaries as a Special Form](#22-dictionaries-as-a-special-form)
  - [2.3 Dictionaries as L3 User Procedures](#23-dictionaries-as-l3-user-procedures)
  - [2.4 Theoretical Questions](#24-theoretical-questions)
  - [2.5 Syntactic Transformation — L32 → L3](#25-syntactic-transformation--l32--l3)
- [Question 3 — L2 to JavaScript Translator](#-question-3--l2-to-javascript-translator)
- [Running the Tests](#-running-the-tests)
- [Design Notes](#-design-notes)
- [Authors](#-authors)

---

## 🌟 Overview

This repository implements the second assignment of **PPL252** (Principles of Programming Languages), extending the **L3** interpreter with a new **dictionary** data type in three progressively different ways, and building a small **source-to-source compiler** that translates **L2** programs into equivalent **JavaScript**.

| Part | Topic | Core Idea |
|------|-------|-----------|
| Q1 | Language variations | Theoretical proofs about expressiveness of L1/L2 subsets |
| **Q2** | **Dictionaries in L3** | Extend syntax, parser & interpreter with `dict` / `get` / `dict?` — three ways |
| **Q3** | **L2 → JavaScript** | Recursively unparse an L2 AST into equivalent JS source code |
| Q4 | Environment diagrams | Visualizing closures, frames & control links for `let*` |

> 💡 **Language recap:** L3 is a small Scheme-like language supporting `define`, `lambda`, `if`, `let`, `quote`, primitive operators, and applications — evaluated here under the **applicative-order, substitution-model** interpreter provided in the course template.

---

## 🗂 Project Structure

```
📦 id1_id2/
├── 📁 src/
│   ├── 📁 L3/            # Baseline L3 parser + substitution/environment interpreters
│   ├── 📁 L31/            # Q2.1 — dict/get/dict? as primitive operators
│   ├── 📁 L32/            # Q2.2 — dict as a special form + DictValue
│   ├── 📄 q23.l3          # Q2.3 — dictionaries implemented purely in L3 userland
│   ├── 📄 q24.l3           # Q2.5 — Dict2App & L32ToL3 syntactic transformations
│   └── 📄 q3.ts            # Q3 — l2ToJS translator
├── 📁 test/
│   ├── 📄 q21.tests.ts
│   ├── 📄 q22.tests.ts
│   ├── 📄 q23.tests.ts
│   ├── 📄 q24.tests.ts
│   └── 📄 q3.tests.ts
├── 📄 id1_id2.pdf           # Written answers (Q1, Q2.4, Q4)
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 README.md
```

> ⚠️ **Grading constraint:** `package.json` and `tsconfig.json` are provided by the course staff and must **not** be modified — the grader uses the original files.

---

## 🚀 Getting Started

```bash
# 1. Unpack the template & install dependencies
unzip ex2.zip -d ppl-assignment-2
cd ppl-assignment-2
npm install

# 2. Run the full test suite
npm test
```

Recommended IDE: **Visual Studio Code** with the TypeScript extension enabled.

---

## 📦 Question 2 — Adding Dictionaries to L3

We extend L3 with a **dictionary** expression (à la JavaScript's `Map`), implemented in **three independent ways** that trade off syntax, semantics, and implementation effort differently.

```lisp
(dict '((a . 1) (b . 2)))        → '((a . 1) (b . 2))
(get (dict '((a . 1) (b . 2))) 'a) → 1
(get (dict '((a . 1) (b . 2))) 'c) → Error…
(dict? (dict '((a . 1) (b . 2)))) → #t
```

### 2.1 Dictionaries as Primitive Operators

📍 **Location:** `src/L31`

Dictionaries are implemented as new **primitive operators** — `dict`, `get`, `dict?` — bolted directly onto the existing primitive-application mechanism, no grammar changes required beyond recognizing the new operator names.

- ✏️ Grammar extended only at the `<prim-op>` level.
- 🧠 Type/shape validation of arguments happens in the **interpreter** (semantics), *not* the parser — malformed dictionary literals are only caught at evaluation time.
- ⚙️ Evaluated under the **applicative-order substitution model**.

```lisp
(dict? '((a . 1) b))     → #f   ; not every pair is a valid entry
(dict? '((a . 1) (b)))   → #t   ; '(b) is sugar for '(b . '())
```

### 2.2 Dictionaries as a Special Form

📍 **Location:** `src/L32`

Here `dict` is promoted to a full **special form**, producing a dedicated `DictValue` at evaluation time. A `DictValue` is itself **applicable** — calling it with a key performs the lookup:

```lisp
(define d (dict (a 1) (b 2)))
(d 'a)   → 1
(d 'b)   → 2
(d 'c)   → Error…
```

- ✏️ Grammar extended with a new `<cexp>` production and a corresponding `DictExp` AST node.
- 🧠 Argument-shape validation happens at **parse time** — a malformed `dict` expression is rejected during syntactic analysis, before evaluation ever begins.
- ⚙️ Requires updates to `parseL32`, the `CExp` type union, and the applicative-order interpreter's `applyProcedure`/`eval` logic to make `DictValue` callable.

### 2.3 Dictionaries as L3 User Procedures

📍 **Location:** `src/q23.l3`

The most "userland" approach: dictionaries, lookups, and **error handling** are all written in **plain L3** — no interpreter or parser changes at all.

```lisp
(dict '((a . 1) (b . 2)))                              → '((a . 1) (b . 2))
(get (dict '((a . 1) (b . 2))) 'a)                       → 1
(is-error? (get (dict '((a . 1) (b . 2))) 'c))           → #t
(dict? '((a . 1) (b . 2)))                                → #t
(bind (get (dict '((a . 1) (b . 2))) 'b) (lambda (x) (* x x))) → 4
```

Includes a small **monadic error-handling toolkit**, built entirely from L3 procedures:

| Procedure | Purpose |
|---|---|
| `make-error` | Wrap a value in an error tag |
| `is-error?` | Check whether a value represents an error |
| `bind` | Chain a computation over a possibly-erroneous value (short-circuits on error) |

### 2.4 Theoretical Questions

Written answers (see `id1_id2.pdf`) cover:

- **(a)** Whether each implementation needs modification under **normal order** evaluation.
- **(b)** Whether each implementation needs modification under the **environment model**.
- **(c)** Why `dict` as a primitive operator (2.1) / user procedure (2.3) cannot accept the field-list syntax `(dict (a 1) (b 2))` the way the special form (2.2) can — analyzed for both **parsing** and **interpreting**, under **applicative** and **normal** order.
- **(d)** Expressiveness gaps: values expressible as a `dict` field in the special-form version but not in the operator/procedure versions.
- **(e)** A comparative recommendation across the three designs (trade-offs in flexibility, safety, and simplicity).

### 2.5 Syntactic Transformation — L32 → L3

📍 **Location:** `src/q24.l3`

Two compiler-style transformation passes over the AST:

1. **`Dict2App`** — rewrites every `DictExp` node into an equivalent `AppExp` calling a `dict` primitive with a quoted key/value list:

   ```lisp
   (dict (a 1) (b 2))  →  (dict '((a . 1) (b . 2)))
   ```

2. **`L32ToL3`** — applies `Dict2App` across a whole L32 program, producing a **semantically equivalent L3 program** where dictionary lookup is performed by *applying* the dictionary value directly:

   ```lisp
   ((dict (a 1) (b 2)) 'a)  →  1
   ```

---

## 🔁 Question 3 — L2 to JavaScript Translator

📍 **Location:** `src/q3.ts`

`l2ToJS` walks an **L2 AST** and produces an equivalent, readable **JavaScript source string** — essentially a tiny transpiler built on top of the course's `unparse` utilities.

| L2 form | JavaScript output |
|---|---|
| `(+ 3 5 7)` | `(3 + 5 + 7)` |
| `(= 3 (+ 1 2))` | `(3 === (1 + 2))` |
| `(if (> x 3) 4 5)` | `((x > 3) ? 4 : 5)` |
| `(lambda (x y) (* x y))` | `((x,y) => (x * y))` |
| `((lambda (x y) (* x y)) 3 4)` | `((x,y) => (x * y))(3,4)` |
| `(define pi 3.14)` | `const pi = 3.14` |
| `(define f (lambda (x y) (* x y)))` | `const f = ((x,y) => (x * y))` |
| `(f 3 4)` | `f(3,4)` |

**Covered L2 primitives:** `+ - * / < > = number? boolean? eq? and or not` — mapped to their JavaScript equivalents (`=` → `===`, etc.) exactly as defined in `applyPrimitive` in the L3 interpreter.

> ℹ️ **Simplifying assumption:** every `lambda` body contains exactly **one expression**.

---

## 🧪 Running the Tests

```bash
npm test
```

Runs the full Jest/Mocha-based suite (per the provided config) across:

```
test/q21.tests.ts   → 2.1  primitive-operator dictionaries
test/q22.tests.ts   → 2.2  special-form dictionaries
test/q23.tests.ts   → 2.3  userland L3 dictionaries
test/q24.tests.ts   → 2.5  Dict2App / L32ToL3 transformations
test/q3.tests.ts    → 3    l2ToJS translator
```

---

## 🧠 Design Notes

- **Separation of concerns:** each dictionary implementation lives in its own directory (`L31`, `L32`) or file (`q23.l3`) so the three designs can be compared side-by-side without cross-contamination.
- **Parser vs. interpreter validation:** a recurring theme across 2.1–2.3 is *where* correctness is enforced — syntax time (special forms) vs. evaluation time (primitives/procedures) — which directly shapes error-reporting behavior and expressiveness.
- **No extra dependencies:** per assignment constraints, everything is built using only the libraries already present in `package.json`.

---

## 👥 Authors

| Name | ID |
|---|---|
| Renad Abu Shareb | `id1` |
| Adan Abo Salok | `id2` |

**Course:** PPL252 — Principles of Programming Languages
**Lecturers:** Meni Adler, Yaron Gonen · **TA:** Israel Zexer

---

<div align="center">

*Made with 🧠, ❤️, and a healthy respect for parentheses.*

</div>
