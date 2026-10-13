# Release 2.4.1 — publish corrected package documentation

## Objective and authorization
User authorized merging documentation PR86 and publishing patch2.4.1 so the corrected README reaches npm. User requests remembering docs before future tags. Merge86 confirmed at a8d819ce6795d32f00527257f0850c557b941341 with greenchecks/pinnedhead. Currentbranch chore/release-2.4.1-docs basedfreshmaina8d819c, cleaninitialtree. Registry2.4.1 absentcanonical404, remottagv2.4.1 absentpreflight. Targetgithub.com/glacayo/website-multipages; release switch remainscloneoff.

## Scope and constraints
Documentationpatch only plus unavoidableversion/ref/help/smoke bookkeeping. Root/CLI2.4.1, defaulttemplatev2.4.1 andCLIhelp/tests must match. PublicREADME/SKILL/AGENTS/CLIREADME currentrefs updated beforetag; preserve2.4.0andolderfeaturehistory. CHANGELOG2.4.1 notesdocumentationcorrectionnotruntimefeaturechanges. Add explicitpretagreleasechecklistdocs/releasing.md includingallpublicdocs/help/changelogandpackagedREADMEproof. No npmmanager, dependency/lock churn, codebehaviorchange, workflowguardrelaxation, permanentageexemption, tokenfallback, blindpublishretry or tagreplacement. Existingpnpm/OIDCstableannotatedtag pipeline remainsauthoritative. No newageexceptionauthorized; localpolicyblocks may be disclosed and freshremoteCI mustprovebuild/data/CLI beforemerge/tag.

## Tasks
- [ ] P1 (implemented; closure pending independent verification/build): Test-first synchronized2.4.1 version/ref/help/smoke, allcurrentversiondocs, docs-onlychangelog and explicitpretagdocumentationchecklist. No newruntimebehavior.
- [ ] P2 (pack/structural checks passed; fresh remote full build/CLI pending): Independentverify versions/docs/history/guards/links; pack exactCLIcandidate withpnpm intoisolatedtemp and inspect tarballREADME to prove correctedcontentwillship. Guard/analytics/CLItests asapplicable; no meaningfulREDforprose, versioncontractRED/GREEN meaningful.
- [ ] P3 (in progress): Commit/pushreleaseunit, createissue-linkedtype:chore PR for review, freshremoteCIbuild/data/CLI/secretpass before authorizedmerge. Then refreshedmain/tag/registrypreflight, oneannotatedv2.4.1tagpush, monitorautomaticallytriggeredexactworkflow, verify registryandGitHubrelease. Stopunknown/failurewithoutblindrepublish.

## Evidence
#86 merged with docsupdated2.4.0 and publishedstatuscorrected. Stablev2.4.0OIDCautopublishrun38337745249success,62guardtests; immutablepublishedtarballholdsolderCLIREADME. Userpreference savedrelease/documentation-before-tag: docs/ref/help/checklist must be coherent BEFOREtag. Thispatch suppliescorrectedpackagedREADME via newversionratherthanoverwrite2.4.0.

## P1 observed evidence
Initialwriter andcontinuationtimedout, incidentreadbackconfirmedonlytestcontracteditandnoactivewriter; freshboundedwritercompleted. ObservedfreshRED30pass/1fail on2.4.0identitythenGREEN31/31 on2.4.1,62releaseguards pass,gitdiffcheckclean. Elevenauthorizedfilesupdatedcurrentdocs/identity/pretagchecklist; no publication claim or runtimebehaviorchanges. Parenttaskpreserved. ASSESSunassessabledueuntrackedtaskartifact requiresindependentverifier, RDDoffunchanged.

## P2 evidence
Independentverify11authorizedfiles(+71/-33), runtimeunchangedapartversion/ref/help, workflows/lock/deps/23guardanddatahashesunchanged. Currentdocs2.4.1,2.4.0featuresclearlyhistorical,SKILLfullyloaded/coherent,checklistexplicitallconsumersBEFOREtag.62releaseguards/10analyticssources/12JSONdirectstructuralcheckspass. FullCLI31pass/1localtemp-scaffoldinstallfailedminimumage(nooverride); remotefullCIneeded.
Actual pnpm pack exited0outsidecheckout:9files38,567byte2.4.1tgz SHA256934bde44594042028809a11ce20aa57229bccb9a30e5d5af4927019fc1fb73fb. PackedREADME7,915bytesexactsourcebyte-match, current2.4.1/v2.4.1/docspatchsection/absoluteURLs/historical2.4.0, noauth/cache/stateartifacts. Packedbinhelp/defaultrefmatch. Thisisverificationnotlivepublication.

## Next step
Commit/pushreleasePR, requirefreshCIbuild/fullCLI/secretgreenbeforemerge/tag. No localageexception or livepublicationyet.
