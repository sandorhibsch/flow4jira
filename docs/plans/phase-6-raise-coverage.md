



# Goal


Reduce architectural risk by refactoring, extracting and adding tests for low-coverage but high domain value components.
We don't want to maximize coverage. A sensible target is probably mid-to-high 70% overall, with application and domain behavior materially higher. Beyond that, the uncovered remainder will increasingly be rendering scaffolding rather than risk-bearing logic.

# Current coverage
Current coverage: 68.4% statements / 68.6% lines / 58.1% branches across 49 passing suites and 380 tests.
The percentage understates the quality of the existing coverage:
- Metrics/domain logic: 98% statements, 99.2% lines
- Flow processing: 100% lines
- Jira clients: 94% lines
- Application services: 88.4% lines
- Routes are generally well covered
- Most remaining uncovered lines are React composition, framework plumbing, and generic UI primitives

# Inventory
## Priority 0 — Confirm and remove likely dead code
These files appear to have no production consumers:
- src/lib/api/board-config.client.ts
  - Uses older /api/boards/... endpoints.
  - Superseded by the repository clients and getBoardConfigClient().
- src/lib/services/workflow-config-service.ts
  - Static localStorage service superseded by BoardConfigLocalRepository.
- src/ui/board-list.tsx
  - Superseded by the board list rendered from app/page.tsx.
- src/ui/flow-issue-list.tsx
  - Superseded by FlowIssueTable.
Deleting confirmed dead code is preferable to writing tests for it.  -
- Remove manual Jira test page - dev-only feature 

## Priority 1 — Board metrics page orchestration
### Assessment
[`src/app/boards/[boardId\]/page.tsx`] is completely uncovered and contains meaningful orchestration:
- Deciding whether browser Jira credentials should be sent
- Fetching Jira issues
- Mapping Jira issues through processJiraIssue
- Saving processed results
- Translating failures into user-facing errors
- Loading, missing-configuration, empty-data, and successful-result states
This logic is too substantial to remain embedded in a 350-line component.

### Recommended design:
- Extract a refreshBoardMetrics application function or service.
- Inject:
  - issue provider/flow client
  - Jira configuration provider
  - issue processor
  - board-config save capability
- Return a discriminated result such as:
  - success
  - invalid configuration
  - fetch failure
  - persistence failure
- Keep the page responsible for state transitions and rendering.

### Tests:
- Application tests with strict hand-written fakes
- A small page behavior suite for:
  - missing configuration redirects to configuration
  - failed refresh shows the returned reason
  - successful refresh saves and reveals results
  - server mode does not read or transmit browser credentials
This is the highest-value remaining work.

## Priority 2 — Jira credential configuration
### Assessment

[`src/app/jira-config/page.tsx`] directly parses and writes localStorage even though a Jira-config repository already exists.
- Storage implementation leaks into the component.
- Validation is embedded in the submit handler.
- Stored JSON is cast rather than validated.
- Invalid stored data is silently ignored.
- The page duplicates the jira-config.local.repository storage key and serialization behavior.

### Recommended design:
- Introduce a pure Jira configuration form model:
  - normalize initial form state
  - validate server credentials
  - validate cloud credentials
  - construct JiraConfig
- Make the page use the existing repository or a capability-based port.
- Add schema validation at the storage boundary if malformed external data is possible.

### Tests:
- Server/cloud validation rules
- Correct configuration construction
- Repository behavior for missing, malformed, server, and cloud data
- UI tests for validation feedback, switching instance type, and successful save/redirect

## Priority 3 — Monte Carlo presentation models
### Assessment
The simulation logic is already well tested. The two React charts remain uncovered because histogram preparation is still inside the components:
- montecarlo-howmany.tsx
- montecarlo-when.tsx

### Recommended design
Extract a small shared distribution presentation model:
- Group simulation outcomes into frequency buckets
- Produce sorted chart points
- Format percentile summaries
- Define empty-input behavior

### Tests
Tests should cover the pure model. React tests only need to verify:
- Changing the slider changes the forecast request/presentation
- Percentile outcomes are displayed
- Empty input is handled meaningfully
Do not test Recharts elements or simulation mathematics again.

## Priority 4 — CFD and issue-table presentation behavior
### Assessment
Cfd-builder.ts already has excellent coverage. cumulative-flow-diagram.tsx mostly formats its results and manages a period slider.


### Recommended design:
- Extract a small CFD presentation model only if formatting or stage ordering grows.
- Test that changing the period updates displayed summaries.
- Test empty-data behavior.
- Avoid chart SVG assertions.
For the issue table:
- Dynamic workflow-column construction is meaningful presentation logic.
- Extract column-value construction or row presentation where possible. 
### Test:
  - workflow stages produce corresponding columns
  - missing history renders blank
  - dates are formatted deterministically
  - issue links and zero-value display rules
  - empty table state and one meaningful sorting interaction
flow-issue-list.tsx should be removed if confirmed obsolete rather than covered.

## Priority 5 — Remaining adapter failure contracts
Coverage gaps worth selectively addressing:
- BoardConfigPgRepository: 78.8% lines / 25.6% branches
- boardconfig-client-server: 84.2% lines
- jira-client-factory: 85.7% lines
- jira-config.local.repository: 28.6% lines
Focus only on contract-relevant failures:
- Missing record versus gateway exception
- Malformed stored values
- Non-JSON or rejected REST responses
- Correct error normalization
- Environment/configuration selection
- Optional-field mapping at the Prisma boundary
Avoid exhaustive tests for defensive branches that merely log and return the same fallback.
Priority 6 — Error boundaries and access guard
Potentially useful behavior coverage:
- ClientConfigWrapper
  - redirects in local mode without credentials
  - does not redirect in server mode
  - allows the Jira configuration route
- GlobalErrorBoundary
  - logs an unexpected render failure
  - renders recovery actions
  - reload/home actions invoke the browser capability
Before testing GlobalErrorBoundary, review whether it overlaps unnecessarily with Next’s global-error.tsx and the existing ErrorBoundary. Consolidation may be better than three overlapping implementations.
Low priority / deliberately exclude
These should not drive the plan:
- layout.tsx
- info/page.tsx
- Button, card, table, dialog, and collapsible wrappers
- Tailwind classes
- Recharts structure
- Static headings and explanatory text
- Framework-required global error boilerplate
- Logger pass-through branches
- Tiny cn() utility
- Branches created solely by optional chaining or generated JSX
- Full-page snapshots

 
# Recommended implementation sequence
1. Dead-code audit and deletion
   - One commit per coherent obsolete path.
   - Verify production references and build after each deletion.
2. Extract board refresh application service
   - Pure orchestration/service tests.
   - Then a small board-page behavior test commit.
3. Refactor Jira credential configuration
   - Pure form/configuration model.
   - Adapter tests.
   - Focused page behavior tests.
4. Extract Monte Carlo distribution presentation model
   - Shared pure model.
   - Minimal behavior tests for both charts.
5. Cover CFD and issue-table outcomes
   - Extract only genuinely reusable or deterministic presentation logic.
   - Add a few user-visible behavior tests.
6. Close important adapter and guard failure paths
   - Select branches based on contract risk, not coverage color.
7. Review coverage exclusions
   - Exclude proven framework boilerplate or generic primitives only when they contain no application decisions.


 
# Principles & constraints

* adhere to Clean Code principles. 
* Use TDD whenever possible
* work on local branch, in small commits
* run full test coverage before each commit
* ask for review before committing