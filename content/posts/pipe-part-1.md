+++
date = '2025-06-28T18:41:59+01:00'
draft = true
title = 'Pipe Part 1: Tokeniser'
+++

I recently stumbled across this [post](https://austinhenley.com/blog/challengingprojects.html) - which is a pretty good list of cool things to work through. It reminded me that I am yet to write a compiler for a simple programming language. This kind of problem is widely agreed as a good learning exercise for any software engineer. It spans across a lot of cool different areas like tokenising, parsing and using making use of [recursive descent parsing](https://en.wikipedia.org/wiki/Recursive_descent_parser).

A project I have always been fond of is [Bento](https://warpstreamlabs.github.io/bento/) (formerly known as Benthos but renamed due to some corporate meddling), it's a pretty cool lightweight way to write stream processing applications. One simply defines some `YAML` with configuration for various [inputs](https://warpstreamlabs.github.io/bento/docs/components/inputs/about) and [outputs](https://warpstreamlabs.github.io/bento/docs/components/outputs/about) and [processors](https://warpstreamlabs.github.io/bento/docs/components/processors/about) sitting in between. This lets developers write something _like_ code to glue together their ETL pipelines without relying on vendors providing integrations between the 9000+ disconnected systems. 

Where it loses its appeal to me is when you _really_ start to lean on it. Benthos is a static binary with the logic driven entirely by YAML and some in-line scripting provided by [Bloblang](https://warpstreamlabs.github.io/bento/docs/guides/bloblang/about). Unless your data sources and sinks are perfectly mapped 1:1 in terms of structure (good luck pal) you are going to have to leverage this at some point. Impressive as it is, when it comes to relying on stuff in production I personally get a bit apprehensive when my critical pipeline is relying on scripts without typing embedded inside YAML. 

So, wouldn't it be cool if we had something strongly typed and unit testable? Added bonus to this would be that I can add new integrations in the same language rather than subjecting myself to Go and writing a new `Input`. The first class processors just become first-class functions in a programming language. 

Alright, let's scope this thing. The likelihood of a weekend coding project being completed is inversely proportional to it's level of aspiration.

We're going to write a fairly basic language, with limited control flow. Here's an example of what for now I am calling `pipe` implementing the first example of the landing page of the Bento docs:

```haskell
import GCP
import REDIS

type Input = {
  Links: [obj]
  Age: String 
}

type Output = {
  message: String
  linkCount: Int
  age: Int
}

fn input :: () -> Input = 
    GCP.pubsub "foo" "bar"

fn process :: input: Input -> Output = 
    input |
    map message |
    map link_count = (length links) |
    map user.age = parse user.age |
    drop links |
    drop Age

fn output out :: out: Output -> () = 
    REDIS.streams "tcp://TODO" "baz" 20
```
What? No main? Yeah, why not? I've always liked the idea of not having a `main` function, it's cool and edgy right? Only case that I personally have seen of this is in shader languages. We have an implicit main that looks something like:

```python
def main():
  for input in read_input():
    result = process(input)
    write_output(result)
```
The other thing of note is what has inspired the language name, is the use of `|`. This is something in between function composition in Haskell and `cat file.txt | head -n 5`. The idea here is that `"foo" | to_lower | add "bar` compiles to something like:
```python
add(to_lower("foo"), "bar")
```
This is so we can force immutability and still avoid repetitive statements you usually get in this kind of problem like:
```
input = "foo"
lowered = to_lower(input)
with_bar = add(lowered, "bar")
return with_bar
```

Pretty good idea right? I don't know, maybe... I'm not convinced. But let's find out together. One thing I can see for sure is using positional arguments getting awkward, but we can maybe work around that. To prototype this quickly we're going to emit python, to make this much harder (but more fun) we are going to write it in Haskell. If it actually turns out to be useful this we can emit something a bit better like C.

Note that `|` is a data pipe, we pass objects through it not necessarily functions. This is maybe something I can add later but for now I don't want to open the can of worms that is function composition and the implications that has for the type system. Additionally, data pipes seem like a natural fit for the problem this space language is being built for.

## Lexer 

First part of anything like this is going to be our tokeniser, let's look at one of our statements and see what kind of tokens we have:
<!-- TODO: Replace with a labelled image -->
```
fn input = GCP.pubsub "foo" "bar" | JSON.parse
```
First thing to consider is that because we make function calls in a Haskell style way we consider whitespace as a token! This isn't true in other languages like JavaScript for example.

To start with we just want to tokenise simple program like:
```
fn input :: () -> String = STD.in "\n"

fn process :: input: String -> String = input | upper 

fn output :: output -> () = output | STD.out ","
```
<!-- Maybe move this somewhere else? -->
This program takes a new-line separated string from [STDIN](https://en.wikipedia.org/wiki/Standard_streams), and returns each string upper-cased and comma-separated instead i.e.

```
foo
bar
```
Becomes:
```
FOO,BAR
```

A lexer is something that interprets the "words" in a language, a parser is what checks the grammar. For example, our tokeniser is fine with `fn |||() = = = () lower` since these are all valid words. Our parser is what should reject this, since it's grammatically incorrect. 

So we're just focusing on just taking something stringy like our source code and returning a list of tokens.

Ok, let's start with just writing something that can process our source code into characters:
```haskell

tokenise :: String -> [Char]
tokenise "" = []
tokenise (c:cs) = c : tokenise cs

main :: IO ()
main = do 
  source <- readFile "source.pipe"
  print $ tokenise source
```
<!-- TODO: Output with expand! -->
Nice, easy. Remember kids in a functional programming language, the answer 9 times out of 10 is to use recursion. 

So let's define some tokens in our type system:
```haskell
data Keyword = 
  Func | 
  LParen | 
  RParen | 
  Eq | 
  Pipe | 
  Type | 
  LCurly | 
  RCurly | 
  Colon | 
  Import | 
  Dot | 
  DoubleColon deriving (Show, Eq)

data Token = 
  NewLine | 
  Iden String | 
  Int Int |
  String String |
  Keyword Keyword
  deriving (Show, Eq)
```
A nice thing here is that we can define the fact that some of our tokens hold data and some don't in our type system, e.g. `Iden String` vs. `NewLine`.

Cool, let's start with the single character tokens, since they are the easiest:
```haskell
tokenise :: String -> [Token]
tokenise "" = []
tokenise s@(c:cs)  
  | c == '\n' = NewLine : tokenise cs
  | c == '(' = Keyword LParen : tokenise cs
  | c == ')' = Keyword RParen : tokenise cs
  | c == '=' = Keyword Eq : tokenise cs
  | c == '|' = Keyword Pipe : tokenise cs
  | c == '{' = Keyword LCurly : tokenise cs
  | c == '}' = Keyword RCurly : tokenise cs
  | c == ':' = Keyword Colon : tokenise cs
  | c == '.' = Keyword Dot : tokenise cs
  | otherwise = tokenise cs
```
With this, we match any single character tokens and skip everything else, we can test with something like:
```haskell
main = print $ tokenise "= . }(){"
```
Let's try something like `fn` next (without abusing the fact that it's only one extra character too much):
```haskell
  | "fn" `isPrefixOf` s = Keyword Func : tokenise (drop 2 s)
```
OK, for keywords we can just add new case like this. Let's continue to do that elsewhere:
```haskell
  | "->" `isPrefixOf` s = Keyword RArrow : tokenise (drop 2 s)
  | "::" `isPrefixOf` s = Keyword DoubleColon : tokenise (drop 2 s)
  | "fn" `isPrefixOf` s = Keyword Func : tokenise (drop 2 s)
  | "import" `isPrefixOf` s = Keyword Import : tokenise (drop 6 s)
```
(`drop`)[http://www.zvon.org/other/haskell/Outputprelude/drop_f.html] is just a way to remove the first `n` characters from the start of the string. So for `-> Foo` the branch we follow produces `Keyword RArrow: tokenise " Foo"`.

The only remaining ones we have are Integers (12345), String literals "Hey I'm a string!" and identifiers. Identifiers is a loose term here, because it can mean a bunch of things. Whether an identifier is a function name or variable is entirely contextual so at the point of parsing we can only say that it's an identifier.

The rest of our logic looks like this:
```haskell
 | isNumber c =
      let (n, rest) = span isNumber s
       in Int (read n) : tokenise rest
  | isAlpha c =
      let (ident, rest) = span isAlpha s
       in Iden ident : tokenise rest
  | c == '"' =
      let (str, rest) = span (/= '"') cs
       in String str : tokenise (drop 1 rest)
```
We can test this with:
```haskell
main :: IO ()
main = do
  print $ tokenise "->::fnimport()=|{}:.foo\"HEY\"1234"
```
Which uses all of our tokens - from this we get:
```
[Keyword RArrow,Keyword DoubleColon,Keyword Func,Keyword Import,Keyword LParen,Keyword RParen,Keyword Eq,Keyword Pipe,Keyword LCurly,Keyword RCurly,Keyword Colon,Keyword Dot,Iden "foo",String "HEY",Int 1234]
```
Nice! What if we do something `tokenise "-- Does this language have comments?` when we do in fact not have comments (yet). Hmm, we get this stack trace which is _okay_:
```
wrench: unexpected token -
CallStack (from HasCallStack):
  error, called at app/Main.hs:58:17 in wrench-0.1.0.0-inplace-wrench:Main
```

There are some improvements we can make here like:
- Better error handling
- More extensibility for new Tokens
- Breaking apart our one big function
- More idiomatic parsing using [megaparsec](https://markkarpov.com/tutorial/megaparsec.html)

But we'll leave those for a later day, at this point we can move onto a parser/emitter.
