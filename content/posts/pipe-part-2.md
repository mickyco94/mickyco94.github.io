+++
date = '2025-06-30T18:52:43+01:00'
draft = true
title = 'Pipe Part 2: A Lesson in Grammar'
+++

So in Part 1 we created a tokeniser, which created the words of our language. Now, before we can think about creating a parser/emitter we need to establish the grammar.

The grammar expresses the rules of your language, such as:

Functions are defined with `def` followed by `()` containing some parameters, then optionally a return type indicated by `->` and finally a symbol indicating the start of the function `:`

I'm sure you've experienced a syntax error, what is happening here is that your statement(s) are checked against the grammar and something has been flagged as not meeting the specification.

One can formalise these rules using the intimidatingly named [Extended Backus-Naur form](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form), this is an example of the complete grammar in Python using [this](https://docs.python.org/3/reference/grammar.html).


So let's try and establish a grammar for `Pipe`, we have some weirdness in our language. For example a valid program is not like another general purpose programming language, it is a collection of functions:

```markdown
program         ::= { function_def nl };
function_def    ::= "fn" iden "::" { arg } " -> " { type } " = " nl block 
block           ::= indent { statement { pipe nl? statement } }
<--! I think this is wrong!! -->
statement       ::= ident { ident | string | digit } 

arg    ::= iden ws? ":" ws? type} | unit
type   ::= upper {letter}
nl     ::= "\n";
indent ::= "  "
pipe   ::= "|";
iden   ::= { letter };
upper  ::= "A" | "B" | "C" | ... | "Z"
letter ::= "a" | "b" | ... "z" | "A" | "B" | ... | "Z";
digit  ::= 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
string ::= "\"" { letter } "\"";
space  ::= " "
unit   ::= "()"
```
