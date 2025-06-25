+++
date = '2025-06-25T22:15:45+01:00'
draft = true
title = 'Versions Hs'
+++

Functional programming has always been an area that sounded pretty interesting to me, its something I have had some limited experience in commercially due to my short tenure at Twitter (thanks Elon). One can spin up a hello world and run through some tutorials and demonstrative kiddy-playground code and it seems great! But these are pretty _academic_ and its difficult to see how this would actually work in a more _real_ environment, larger codebase with lots of IO from databases and message queues etc. 

Today we're going to take a practical problem that I worked through in my day job that is (in my opinion) pretty interesting, lends itself to what I *think* functional programming is good for and try to implement it in Haskell. 

## The Problem

So to give us something that we can really sink our teeth into and flesh out we're going to be working on a version promotion algorithm for a continuous delivery system. In the realm of open source the closest system is something like [concourse-ci](https://concourse-ci.org/resources.html). At a high-level we have some versions of software that are children of resources, so the simple example is a `git` repository is a type of `resource` in our system and a `commit` will be a `version` of that `resource`. The same concept can be applied to Docker images, Helm charts, etc. Basically anything that produces immutable versions and has some repository you can fetch from fits into this model. 

In our system we want to qualify, filter and promote these versions through a continuous delivery pipeline. The key part (that will be clearer later) is that we want to promote _combinations_ of versions together. So if I have a `Build` phase in my pipeline that passes with a particular Docker image version and set of static configuration, then these two versions become linked and should be promoted together. That particular version of a Docker image isn't valid to be promoted in all cases, its specifically valid to be promoted _with_ that particular set of config. This is an important distinction.

## Setting up Haskell

Now that we have a problem that is real and reasonably complex to solve we can really put Haskell through its paces and see where it creaks and where it shines.

I won't go through all my IDE setup, installing of binaries etc. because that is probably best left for another blog post and would effectively boil down to me copy-pasting the far better curated content that already exists out there. Instead I will add links to the resources I used at the end of this post.

## Starting simple

Lets start with the basics, we want to define our core entity. Which is a software version that looks something like:
```json
{
  "id": "60da6d",
  "repository": "github.com/mickyco94/versions-hs",
  "author": "mickyco94",
  "resource": "versions-hs",
  "type": "git",
  "branches": ["refs/heads/master"],
  "createdAt": "2025-06-25T21:24:31"
}
```
This is true for a git commit, but of course some fields like repository don't apply to all. The fields that are consistent to all versions of any type are `id`, `createdAt` and `resource`. We have `type` here as a discriminator, so we know that if `type` is `git` we can expect these other fields. The other fields are particular metadata that we can "select" on - more on that later.

We can define this in Haskell using records:
```haskell
data Metadata
  = GitMetadata {repository :: String, branches :: [String], author :: String}
  | DockerMetadata {repository :: String, tags :: [String]}
  deriving (Show, Eq)

data ResourceType = Git | Docker deriving (Show, Eq)

data Version
  = Version
  { versionId :: String
  , resourceType :: ResourceType
  , resource :: String
  , metadata :: Metadata
  , createdAt :: UTCTime
  }
  deriving (Show, Eq)
```
Here we have a version of a particular `resourceType`, either `Git` or `Docker` (we can add more later). A possible issue here is that we have two ways to discriminate between version types here, `metadata` and `resourceType` fields to achieve both. You can technically have a `Version` with `resourceType = Docker` and store `GitMetadata`. We can revisit this.

An interesting discovery from this fairly simple endeavour is a restriction on field names, you might have noticed that we renamed our `id` field to `versionId`, this is so that we don't conflict with [Prelude.id](http://www.zvon.org/other/haskell/Outputprelude/id_f.html) from the standard library.

#### Why include resource?

Well this is a good question, it is basically an identifier for your grouping of versions within some deployment pipeline. One might track the same repo multiple times, using one instance of that resource to track database migration SQL scripts and another for your service deployment. So we track these independently. It also allows us to easily query for it without needing to know the underlying type and what unique identifier of the collective repository is relevant for a particular type of version.

### Selectors
Selectors are a simple principle, inspired vaguely by [Kubernetes](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/). These are a declarative way for a user to say that they want only a version with _some_ attributes, and these can be defined on the fly. This supports simple things like filtering only to master branch for a production stage, or a `stable` tag when using a `Docker` image.

A user may define a selector like so:
```yaml
my_resource:
  type: git
  repository: github.com/mickyco94/versions-hs
  selectors:
    branch: master
    author: mickyco94
```
Maybe in our hypothetical CI/CD pipeline we want to trust only commits from master (and rightfully those by me) to be pushed into production. 

So lets write some kind of parser for this and apply it to our versions, should be pretty simple:
```
data Selector = HasBranch [String] | Author String

matches :: Selector -> Version -> Bool
matches (HasBranch s) Version{metadata = GitMetadata{branches = b}} = any (`elem` b) s
matches (Author a) Version{metadata = GitMetadata{author = ga}} = ga == a
matches _ _ = False
```

<!-- 
Expand on parsing, how it applies to YAML parsing and then use a matches that takes a [Selector]
-->

#### References

- https://www.haskell.org/get-started/
- https://learnyouahaskell.github.io/chapters.html
- 

