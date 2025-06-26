+++
date = '2025-06-26T15:52:54+01:00'
title = 'Why We Review Code'
+++

I've worked in a few different places, and experienced a few different answers to this question. At times PRs have been the place for philosophical debate on the merits of a particular pattern whereas in others it's been seen as a barrier that I need to find a trusty co-worker to remove for me, so I can smash the Done button on that JIRA ticket before my manager screams at me. 

The reason for this is something I've been thinking about recently, what forces create each of these environments? What is the indirect value that we get from a review process outside the obvious spotting bugs? 

So here we go, enjoy my collection of musings around why things get into a bad state and where you want to be.

---
### Ownership

Anyone who has been in this world for a while knows that the worst codebases are those with shared ownership, a project with no home and no custodian to keep it clean. 
If I think about the kind of PR that I review unenthusiastically it is one that I have zero context on, and I have somehow got permission to approve. These places are where quality goes to die and bugs fester. 

Basically this boils down to not having to deal with the consequences of the author's actions, I don't really care if they badly re-implemented some basic functionality in the standard library for no reason. You know why? I don't have to deal with the consequences, ever. I'm not going to touch that code ever again and if it breaks something I'm not the one who has to fix it. This is the cynical view, leaders in tech often appeal to people's better nature as a counterbalance for this. However, the incentives are the incentives, and we can observe this in effect in the wild.

### "I'm blocked"

Deferred gratification has long been understood as a flaw of the human condition. Why would I save money when I can get McDonald's NOW. We make these kinds of self-sabotaging decisions all day every day and the process of code review is no different. 

At the point at which your code is in review you naturally feel stuck, resolving comments and addressing small bugs feels tedious and unsatisfying. We bargain with our reviewer like an addict looking for a hit: "can I fix this in a follow-up?" All for that sweet release of that change **finally** being merged.

This is something we have to actively resist. It is objectively faster to address these problems up front than it is to take the slower path of merging, following up with a fix and then merging again N times. Acknowledge that it is part of our nature and try to foster a culture that corrects for this natural flaw in our existence. 

Ultimately, what people want is for changes to resolve quickly and to be able to move onto the next thing. The reviewer finds the process as tedious as the author and likely there is some pointy-haired manager wondering what is taking so long. One way to get there is to not care, we'll deal with it later, or we can make it someone else's problem. But this has consequences and there are other ways to resolve this.


## Why you want to raise the bar 

I like to think of a code review as the place where coding standards are debated in real-time, using real examples. There are tons of micro-decisions when writing software and each of the options often have equal merit. But we have to acknowledge that there is value in consistency. 

If within a single project I see multiple ways to solve the same problem and take the time to understand that they differ slightly "because why not" rather than for a valid reason then that is taxing mentally, and I would rather have spent those mental CPU credits understanding the actual domain problems. 

Consistency creates a familiarity and minimises decisions when writing code, kinda like these CEOs who wear white t-shirts every day, so they can preserve their precious brains for deciding which marketing team to lay off this quarter.

Even in Go, which strives to be a language that is standardised and has few ways to achieve the same goal, one has multiple options for a lot of cases. Take the following, fairly contrived, example:
```go
import (
	"github.com/samber/lo"
)

func main() {
	nums := []int{1, 2, 3, 4, 5}

	// Sum simply as possible
	total := 0
	for _, num := range nums {
		total += num
	}

	// Sum with a helper
	total = sum(nums)

	// Sum recursively
	total = recursive(nums)

	// Sum with a reduce
	total = lo.Reduce([]int{1, 2, 3, 4}, func(agg int, item int, _ int) int {
		return agg + item
	}, 0)

	// Sum with an external library
	total = lo.Sum(nums)
}

func recursive(nums []int) int {
	if len(nums) == 0 {
		return 0
	}
	return nums[0] + recursive(nums[1:])
}

func sum(nums []int) int {
	total := 0
	for _, num := range nums {
		total += num
	}
	return total
}
```
Now none of these are exactly _wrong_, but they all have some trade-offs. Let's [steel man](https://cat.org.uk/external-resources/the-steel-man-technique/#:~:text=How%20To%20Argue%20Better%20And,argument%20and%20engages%20with%20that.) 🗿 and play devil's advocate 😈 for each of these:
- Simple:
  - 🗿: Keep it simple stupid, no surprises. Nothing fancy
  - 😈: Too verbose, there might be many things happening in this main function and this is noisy boilerplate. Not DRY
- Helper:
  - 🗿: Simple but encapsulated, reusable and DRY
  - 😈: Not generic, can only sum integers so not reusable. What about float or other sized integers? We're defining a function that already exists
- Recursive:
  - 🗿: Recursion is intuitive, more natural
  - 😈: Hard to debug, we're going to add a lot to the call stack for long arrays
- Reduce:
  - 🗿: Clean, expressive, immutable values
  - 😈: Over-engineering, brought in a dependency unnecessarily now we need to manage updates for this library
- External Lib:
  - 🗿: Not reinventing the wheel, concise and easy to follow
  - 😈: More over-engineering but this time I don't know how it works. How can I debug it?

I think you get my point. 

So if I see someone use `Reduce` when I would've just used the `Simple` approach and I ask why they opted for it, we are establishing our coding standard in real-time. We're debating on whether we want to go for a "keep it simple stupid" style of programming in our codebase or more functional and purist. 

Whatever the choice, it doesn't really matter. But, if we can agree on an approach and be consistent about it, we are minimising the number of decisions we make later. We collectively remove the small micro-decisions from our day-to-day one by one through engaging in this discourse. This is a large part of the review process - at least for me personally.

### Ideal state of the hive mind 

Taking this to its logical extreme you can, over time, squash each one of these small decisions. At this point you have reaped the benefits of all the 200+ comments on PRs debating over `camelCase` and `snake_case`. Everyone is on the same page, the standards are set without even writing any. 

Maybe at this point it's a good time to write them down but, honestly it's not even necessary, the process of review and deep state of alignment is a forcing factor here and is more valuable than some coding standards bible that is lost in a shared Google Drive somewhere. The other point is that these naturally evolve.

For the skeptical reader who thinks this is only theoretical I would say to you that I have worked in a team that has been in this state, and honestly it was great. Changes moved very fast, the codebase was easy to read, easy to navigate and onboarding new people was bliss. Velocity went through the roof as the PR process became a quick sanity check and bugs didn't creep in as much because fundamentally more people understood the code base. 

If a change took a while to review, that was warranted. The only case this happened was when approaching a new kind of problem that pushed the informal standards to their limit and necessitated some debate.

This is where you want to be. As we discussed earlier, no one likes their PR "stuck in review" but no one likes everything being broken and this is how you get there.


## Learning

This is an underrated one in my opinion, but one of the best ways to make sure you write good software and avoid issues before they exist is simply knowing what the fuck is going on. 

Deeply understanding your codebase and that task being manageable will minimise the risk of adverse changes to your project more than anything and identify areas for improvement. A great way to do this is to understand the recent changes, the issues that need to be worked around. That test that always causes a problem. Here you see the leaks in the system, and you can understand them when you want to make a change yourself.

For this reason I am strongly of the opinion that new hires do not write code, they just review it. They ask questions about things they don't understand (spoiler alert, they understand nothing) and through that process they begin to understand how the different moving parts work as well as by default getting up to speed on the de facto standards.


