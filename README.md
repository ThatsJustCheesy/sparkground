# Sparkground

## Block-based digital playground for learning functional programming

Sparkground is an experimental block-based functional programming language, inspired by [Scratch](https://scratch.mit.edu/), [Racket](https://racket-lang.org/) and various industrial languages.

Sparkground was designed from the beginning to facilitate visual code editing, by presenting each expression as a draggable "block". This design space has been extensively explored, most notably by Scratch. However, existing block-based languages rely on the statement-expression dichotemy afforded by an imperative programming paradigm. Enabling visual editing for languages without a statement-expression dichotemy presented (and continues to present) a unique challenge.

Sparkground also has a static type system, with the aim to catch common mistakes and enable certain contextual editing actions. Being a gradual type system, it can be selectively disabled. There is [writeup](https://igregory.ca/blog/sparkground-static-type-system/) that describes the system in detail.

[Try it](https://igregory.ca/sparkground)
