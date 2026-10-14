# Graph Report - ADC Exam Prep App  (2026-10-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 6015 nodes · 9750 edges · 301 communities (226 shown, 75 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f333fe7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 238
- Community 239
- Community 240
- Community 241
- Community 242
- Community 243
- Community 244
- Community 245
- Community 300

## God Nodes (most connected - your core abstractions)
1. `auth` - 446 edges
2. `next` - 280 edges
3. `db` - 247 edges
4. `@prisma/client` - 220 edges
5. `lucide-react` - 76 edges
6. `PageHeader()` - 69 edges
7. `react` - 64 edges
8. `getSetting()` - 43 edges
9. `zod` - 42 edges
10. `formatPrice()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `generateSeoForExam()`  [EXTRACTED]
  scripts/seo-populate.ts → src/lib/seo-assist.ts
- `generateForExam()` --calls--> `streamGenerateQuestions()`  [EXTRACTED]
  scripts/generate-questions.ts → src/lib/claude.ts
- `main()` --calls--> `seedAi900()`  [EXTRACTED]
  prisma/seeds/ai900.ts → src/lib/seed/ai900-questions.ts
- `main()` --calls--> `seedAz104()`  [EXTRACTED]
  prisma/seeds/az104.ts → src/lib/seed/az104-questions.ts
- `main()` --calls--> `seedAz204()`  [EXTRACTED]
  prisma/seeds/az204.ts → src/lib/seed/az204-questions.ts

## Import Cycles
- None detected.

## Communities (301 total, 75 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (168): Opt, P1, P2, P3, Q, REF_ACM, REF_ARC, REF_ASG (+160 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (130): Opt, P1, P2, P3, PL300_BUNDLE, PL300_DOMAINS, PL300_EXAMS, Q (+122 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (104): MS102_BUNDLE, MS102_DOMAINS, MS102_EXAMS, Opt, P1, P2, P3, Q (+96 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (70): create(), dynamic, Field(), NewBundlePage(), deleteRead(), dynamic, markAllRead(), NotificationsPage() (+62 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (100): MD102_BUNDLE, MD102_DOMAINS, MD102_EXAMS, Opt, P1, P2, P3, Q (+92 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (95): Opt, P1, P2, P3, Q, REF_7RS, REF_ACM, REF_ASG (+87 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (96): Opt, P1, P2, P3, Q, REF_AH_BEST, REF_AH_SCHEMA, REF_AIR (+88 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (91): AZ104_BUNDLE, AZ104_DOMAINS, AZ104_EXAMS, Opt, P1, P2, P3, Q (+83 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (65): AdminLayout(), Body, dynamic, extractHtml(), POST(), runtime, Body, dynamic (+57 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (75): MS700_BUNDLE, MS700_DOMAINS, MS700_EXAMS, Opt, P1, P2, P3, Q (+67 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (60): AuditLogPage(), dynamic, loadLogs(), LogRow, MetadataCell(), SearchParams, targetHref(), AdminCouponsPage() (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (71): GCP_PCDOE_BUNDLE, GCP_PCDOE_DOMAINS, GCP_PCDOE_EXAMS, Opt, P1, P2, P3, Q (+63 more)

### Community 12 - "Community 12"
Cohesion: 0.03
Nodes (70): GCP_PDE_BUNDLE, GCP_PDE_DOMAINS, GCP_PDE_EXAMS, Opt, P1, P2, P3, Q (+62 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (49): zod, Body, POST(), Body, POST(), Body, POST(), Body (+41 more)

### Community 14 - "Community 14"
Cohesion: 0.03
Nodes (65): AZ204_BUNDLE, AZ204_DOMAINS, AZ204_EXAMS, Opt, P1, P2, P3, Q (+57 more)

### Community 15 - "Community 15"
Cohesion: 0.03
Nodes (62): GCP_PCA_BUNDLE, GCP_PCA_DOMAINS, GCP_PCA_EXAMS, Opt, P1, P2, P3, Q (+54 more)

### Community 16 - "Community 16"
Cohesion: 0.03
Nodes (61): KCNA_BUNDLE, KCNA_DOMAINS, KCNA_EXAMS, Opt, P1, P2, P3, Q (+53 more)

### Community 17 - "Community 17"
Cohesion: 0.03
Nodes (61): Opt, P1, P2, P3, Q, REF_ACCESS_REVIEW, REF_AKS_SEC, REF_APIM (+53 more)

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (59): JAVA17_BUNDLE, JAVA17_DOMAINS, JAVA17_EXAMS, Opt, P1, P2, P3, Q (+51 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (29): lucide-react, react, CreateExamAiAssist(), Row, ExamOpt, Row, TestimonialEditor(), dynamic (+21 more)

### Community 20 - "Community 20"
Cohesion: 0.04
Nodes (28): db, db, CKAD_EXAM_SLUGS, db, db, db, KV, @prisma/client (+20 more)

### Community 21 - "Community 21"
Cohesion: 0.03
Nodes (57): KCSA_BUNDLE, KCSA_DOMAINS, KCSA_EXAMS, Opt, P1, P2, P3, Q (+49 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (57): Opt, P1, P2, P3, PL600_BUNDLE, PL600_DOMAINS, PL600_EXAMS, Q (+49 more)

### Community 23 - "Community 23"
Cohesion: 0.03
Nodes (57): Opt, P1, P2, P3, Q, REF_ACCESSPKG, REF_ACCESSREVIEW, REF_ADMINCONSENT (+49 more)

### Community 24 - "Community 24"
Cohesion: 0.03
Nodes (58): Opt, P1, P2, P3, Q, REF_ACCREV, REF_AUDIT, REF_AUTHN (+50 more)

### Community 25 - "Community 25"
Cohesion: 0.03
Nodes (40): dynamic, PdfAuthorPage(), dynamic, POST(), Result, RETIRED_BUNDLE_SLUGS, runtime, dynamic (+32 more)

### Community 26 - "Community 26"
Cohesion: 0.03
Nodes (57): CONSUL_BUNDLE, CONSUL_DOMAINS, CONSUL_EXAMS, Opt, P1, P2, P3, Q (+49 more)

### Community 27 - "Community 27"
Cohesion: 0.03
Nodes (57): Opt, P1, P2, P3, Q, REF_AGG, REF_BINS, REF_BLEND (+49 more)

### Community 28 - "Community 28"
Cohesion: 0.04
Nodes (41): AdminAdminsPage(), demote(), promote(), BlueprintAuthorPage(), dynamic, Change, POST(), runtime (+33 more)

### Community 29 - "Community 29"
Cohesion: 0.03
Nodes (55): CCDV_BUNDLE, CCDV_DOMAINS, Opt, Q, QUESTIONS, REF_AGENT_BUILD, REF_AGENT_PERMISSIONS, REF_AGENT_SDK (+47 more)

### Community 30 - "Community 30"
Cohesion: 0.03
Nodes (56): GCP_PCNE_BUNDLE, GCP_PCNE_DOMAINS, GCP_PCNE_EXAMS, Opt, P1, P2, P3, Q (+48 more)

### Community 31 - "Community 31"
Cohesion: 0.04
Nodes (53): AI900_BUNDLE, AI900_DOMAINS, AI900_EXAMS, Opt, P1, P2, P3, Q (+45 more)

### Community 32 - "Community 32"
Cohesion: 0.04
Nodes (53): AZ305_BUNDLE, AZ305_DOMAINS, AZ305_EXAMS, Opt, P1, P2, P3, Q (+45 more)

### Community 33 - "Community 33"
Cohesion: 0.04
Nodes (36): ExamHealth, GET(), runtime, dynamic, GET(), POST(), runtime, POST() (+28 more)

### Community 34 - "Community 34"
Cohesion: 0.04
Nodes (26): next, POST(), RENAMES, runtime, POST(), runtime, POST(), runtime (+18 more)

### Community 35 - "Community 35"
Cohesion: 0.04
Nodes (50): CCAR_P_BUNDLE, CCAR_P_DOMAINS, Opt, Q, QUESTIONS, REF_AGENT_BUILD, REF_AGENT_COST, REF_AGENT_PERMISSIONS (+42 more)

### Community 36 - "Community 36"
Cohesion: 0.04
Nodes (51): GITLAB_BUNDLE, GITLAB_DOMAINS, GITLAB_EXAMS, Opt, P1, P2, P3, Q (+43 more)

### Community 37 - "Community 37"
Cohesion: 0.04
Nodes (51): OCI_FOUNDATIONS_BUNDLE, OCI_FOUNDATIONS_DOMAINS, OCI_FOUNDATIONS_EXAMS, Opt, P1, P2, P3, Q (+43 more)

### Community 38 - "Community 38"
Cohesion: 0.04
Nodes (49): CCA_BUNDLE, CCA_DOMAINS, Opt, Q, QUESTIONS, REF_AGENT_BUILD, REF_AGENT_PY, REF_AGENT_SDK (+41 more)

### Community 39 - "Community 39"
Cohesion: 0.04
Nodes (50): DP600_BUNDLE, DP600_DOMAINS, DP600_EXAMS, Opt, P1, P2, P3, Q (+42 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (40): AdminOverview(), dynamic, Kpi(), QuickLink(), dynamic, RevenueReportPage(), SearchParams, Stat() (+32 more)

### Community 41 - "Community 41"
Cohesion: 0.04
Nodes (49): Opt, P1, P2, P3, Q, REF_APPROLE, REF_ARCH, REF_AUTH (+41 more)

### Community 42 - "Community 42"
Cohesion: 0.04
Nodes (47): Opt, P1, P2, P3, Q, REF_APPLY, REF_BACKENDS, REF_CLI (+39 more)

### Community 43 - "Community 43"
Cohesion: 0.04
Nodes (45): db, main(), ELASTIC_BUNDLE, ELASTIC_DOMAINS, ELASTIC_EXAMS, Opt, P1, P2 (+37 more)

### Community 44 - "Community 44"
Cohesion: 0.04
Nodes (45): db, Opt, P1, P2, P3, Q, R_AR, R_AUTOML (+37 more)

### Community 45 - "Community 45"
Cohesion: 0.04
Nodes (45): db, main(), Opt, P1, P2, P3, PENTEST_BUNDLE, PENTEST_DOMAINS (+37 more)

### Community 46 - "Community 46"
Cohesion: 0.04
Nodes (44): db, main(), Opt, P1, P2, P3, PL900_BUNDLE, PL900_DOMAINS (+36 more)

### Community 47 - "Community 47"
Cohesion: 0.04
Nodes (44): CysaQ, Opt, REF_ABUSEIPDB, REF_ATOMIC, REF_BURP, REF_CHECKOV, REF_CIS, REF_CVSS4 (+36 more)

### Community 48 - "Community 48"
Cohesion: 0.04
Nodes (44): DCA_BUNDLE, DCA_DOMAINS, DCA_EXAMS, Opt, P1, P2, P3, Q (+36 more)

### Community 49 - "Community 49"
Cohesion: 0.05
Nodes (42): db, main(), CKS_BUNDLE, CKS_DOMAINS, CKS_EXAMS, Opt, P1, P2 (+34 more)

### Community 50 - "Community 50"
Cohesion: 0.05
Nodes (41): db, main(), Opt, P1, P2, P3, Q, REF_AWS_WAF (+33 more)

### Community 51 - "Community 51"
Cohesion: 0.05
Nodes (39): db, main(), CCNP_SECURITY_BUNDLE, CCNP_SECURITY_DOMAINS, CCNP_SECURITY_EXAMS, Opt, P1, P2 (+31 more)

### Community 52 - "Community 52"
Cohesion: 0.05
Nodes (40): db, main(), CKA_BUNDLE, CKA_DOMAINS, CKA_EXAMS, Opt, P1, P2 (+32 more)

### Community 53 - "Community 53"
Cohesion: 0.05
Nodes (39): db, main(), Opt, P1, P2, P3, Q, REF_800_115 (+31 more)

### Community 54 - "Community 54"
Cohesion: 0.05
Nodes (40): CYSA_P2, CYSA_BUNDLE, CYSA_DOMAINS, CYSA_EXAMS, CysaQ, Opt, P1, REF_CIS (+32 more)

### Community 55 - "Community 55"
Cohesion: 0.05
Nodes (39): db, main(), Opt, P1, P2, P3, PSPO_BUNDLE, PSPO_DOMAINS (+31 more)

### Community 56 - "Community 56"
Cohesion: 0.06
Nodes (29): DARK, fs, LIGHT, path, resizeAndPad(), sharp, strictBounds(), APPLE (+21 more)

### Community 57 - "Community 57"
Cohesion: 0.05
Nodes (37): db, main(), ISC2CC_BUNDLE, ISC2CC_DOMAINS, ISC2CC_EXAMS, Opt, P1, P2 (+29 more)

### Community 58 - "Community 58"
Cohesion: 0.05
Nodes (38): db, main(), NETWORKPLUS_BUNDLE, NETWORKPLUS_DOMAINS, NETWORKPLUS_EXAMS, Opt, P1, P2 (+30 more)

### Community 59 - "Community 59"
Cohesion: 0.05
Nodes (38): CYSA_P3, CysaQ, Opt, REF_CIS, REF_CUCKOO, REF_CVSS4, REF_DMARC, REF_EPSS (+30 more)

### Community 60 - "Community 60"
Cohesion: 0.10
Nodes (30): qrcode, stripe, Body, POST(), runtime, Body, POST(), runtime (+22 more)

### Community 61 - "Community 61"
Cohesion: 0.06
Nodes (34): db, main(), DEVNET_BUNDLE, DEVNET_DOMAINS, DEVNET_EXAMS, Opt, P1, P2 (+26 more)

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (32): db, main(), CCAO_BUNDLE, CCAO_DOMAINS, Opt, Q, QUESTIONS, REF_AUP (+24 more)

### Community 63 - "Community 63"
Cohesion: 0.06
Nodes (32): db, main(), POST(), runtime, CCSP_BUNDLE, CCSP_DOMAINS, CCSP_EXAMS, Opt (+24 more)

### Community 64 - "Community 64"
Cohesion: 0.06
Nodes (32): db, main(), Opt, P1, P2, P3, PMIACP_BUNDLE, PMIACP_DOMAINS (+24 more)

### Community 65 - "Community 65"
Cohesion: 0.10
Nodes (27): addItem(), BundleDetailPage(), deleteBundle(), dynamic, Field(), moveItem(), removeItem(), requireAdmin() (+19 more)

### Community 66 - "Community 66"
Cohesion: 0.06
Nodes (32): db, main(), IASSC_GB_BUNDLE, IASSC_GB_DOMAINS, IASSC_GB_EXAMS, Opt, P1, P2 (+24 more)

### Community 67 - "Community 67"
Cohesion: 0.06
Nodes (31): db, main(), CKAD_BUNDLE, CKAD_DOMAINS, CKAD_EXAMS, Opt, P1, P2 (+23 more)

### Community 68 - "Community 68"
Cohesion: 0.10
Nodes (30): AdminBundlesPage(), bulkBundleAction(), bundleBaseCode(), BundleRow, deleteBundleFromList(), duplicateBundle(), dynamic, fmtDate() (+22 more)

### Community 69 - "Community 69"
Cohesion: 0.07
Nodes (29): name, private, version, @auth/prisma-adapter, autoprefixer, class-variance-authority, clsx, eslint (+21 more)

### Community 70 - "Community 70"
Cohesion: 0.07
Nodes (27): db, main(), ITIL4_BUNDLE, ITIL4_DOMAINS, ITIL4_EXAMS, Opt, P1, P2 (+19 more)

### Community 71 - "Community 71"
Cohesion: 0.07
Nodes (28): db, main(), Opt, P1, P2, P3, Q, REF_NIST_CIA (+20 more)

### Community 72 - "Community 72"
Cohesion: 0.11
Nodes (24): main(), deliverVoucher(), grantVoucherToUser(), issueExistingVoucher(), runDeliveriesAction(), SearchParams, sendNowAction(), authorize() (+16 more)

### Community 73 - "Community 73"
Cohesion: 0.11
Nodes (23): EmailForm(), FieldGrid(), Initial, Transport, dynamic, EmailSettingsPage(), ERROR_LABELS, EMAIL_COMMON_FIELDS (+15 more)

### Community 74 - "Community 74"
Cohesion: 0.07
Nodes (28): db, main(), APLUS_BUNDLE, APLUS_DOMAINS, APLUS_EXAMS, Opt, P1, P2 (+20 more)

### Community 75 - "Community 75"
Cohesion: 0.07
Nodes (27): db, main(), Opt, P1, P2, P3, PROJECT_PLUS_BUNDLE, PROJECT_PLUS_DOMAINS (+19 more)

### Community 76 - "Community 76"
Cohesion: 0.07
Nodes (27): db, main(), Opt, P1, P2, P3, Q, REF_BOOT (+19 more)

### Community 77 - "Community 77"
Cohesion: 0.20
Nodes (22): db, main(), P1, P2, P3, P4, P5, P6 (+14 more)

### Community 78 - "Community 78"
Cohesion: 0.06
Nodes (29): CCA_P2, CcaQ, Opt, R_AGENTS, R_BATCHES, R_CACHING, R_CC_CLI, R_CC_HOOKS (+21 more)

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (23): pdf-parse, Body, dynamic, POST(), runtime, dynamic, POST(), runtime (+15 more)

### Community 80 - "Community 80"
Cohesion: 0.15
Nodes (25): pdf-lib, dynamic, issueCreditNote(), requireAdmin(), resendInvoice(), voidInvoice(), dynamic, GET() (+17 more)

### Community 81 - "Community 81"
Cohesion: 0.07
Nodes (28): CCA_P3, R_AGENTS, R_BATCHES, R_CACHING, R_CC_CLI, R_CC_HOOKS, R_CC_OVERVIEW, R_CC_SETTINGS (+20 more)

### Community 82 - "Community 82"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/claude-agent-sdk, argon2, @auth/prisma-adapter, class-variance-authority, clsx, handlebars, @hookform/resolvers (+20 more)

### Community 83 - "Community 83"
Cohesion: 0.09
Nodes (20): db, j(), main(), q(), SLUGS, db, host, m (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.11
Nodes (19): @paypal/react-paypal-js, BundleCheckoutClient(), TRUST_COPY, AddressDto, BillingAddressCard(), EMPTY, Field(), Props (+11 more)

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (22): ApiTokensPage(), createToken(), dynamic, requireAdmin(), revokeToken(), BannersAdminPage(), createBanner(), deleteBanner() (+14 more)

### Community 86 - "Community 86"
Cohesion: 0.18
Nodes (20): GET(), CatalogFilters(), Vendor, CatalogPage(), HighlightedText(), Pagination(), revalidate, VendorCatalogPage() (+12 more)

### Community 87 - "Community 87"
Cohesion: 0.08
Nodes (24): db, main(), CAPM_BUNDLE, CAPM_DOMAINS, CAPM_EXAMS, Opt, P1, P2 (+16 more)

### Community 88 - "Community 88"
Cohesion: 0.08
Nodes (23): db, main(), Opt, P1, P2, P3, PMIRMP_BUNDLE, PMIRMP_DOMAINS (+15 more)

### Community 89 - "Community 89"
Cohesion: 0.11
Nodes (15): next-auth, LoginInner(), LoginPage(), SignupPage(), VerifyOtpInner(), VerifyOtpPage(), GitHubIcon(), GoogleIcon() (+7 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (19): dynamic, POST(), runtime, Body, POST(), runtime, POST(), dynamic (+11 more)

### Community 91 - "Community 91"
Cohesion: 0.15
Nodes (22): "AdminLog", AdminLog_adminId_createdAt_idx, "Attempt", Attempt_guestToken_idx, Attempt_userId_examId_idx, "Entitlement", Entitlement_userId_examId_tier_key, Entitlement_userId_idx (+14 more)

### Community 92 - "Community 92"
Cohesion: 0.10
Nodes (11): AuthorChooserPage(), dynamic, FaqAdminClient(), FaqEditor(), FaqRow, dynamic, FaqAdminPage(), ReviewRow() (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.09
Nodes (18): BUNDLES, BundleSeed, CLAUDE_ARCHITECT_DOMAINS, CLAUDE_ARCHITECT_PRO_DOMAINS, CLAUDE_ASSOCIATE_DOMAINS, CLAUDE_CERT_INFO, CLAUDE_DEVELOPER_DOMAINS, db (+10 more)

### Community 94 - "Community 94"
Cohesion: 0.22
Nodes (19): DELETE(), GET(), isKey(), POST(), PUT(), requireAdmin(), compile(), compileCache (+11 more)

### Community 95 - "Community 95"
Cohesion: 0.16
Nodes (16): generateMetadata(), inter, RootLayout(), Contact(), displayPhone(), Footer(), FooterHeading(), FooterGate() (+8 more)

### Community 96 - "Community 96"
Cohesion: 0.11
Nodes (15): argon2, PEOPLE, POST(), runtime, POST(), runtime, dynamic, setPassword() (+7 more)

### Community 97 - "Community 97"
Cohesion: 0.14
Nodes (16): assignVoucher(), deleteOrder(), dynamic, loadOrders(), markPaid(), OrderRow, refund(), requireAdmin() (+8 more)

### Community 98 - "Community 98"
Cohesion: 0.23
Nodes (19): addNote(), AdminUserDetailPage(), anonymizeUser(), attachTag(), bump(), Card(), deleteNote(), detachTag() (+11 more)

### Community 99 - "Community 99"
Cohesion: 0.18
Nodes (15): main(), DbClient, fxKeyFor(), issueCreditNoteForInvoice(), IssueInput, issueInvoiceForOrder(), callProviderRefund(), RefundInput (+7 more)

### Community 100 - "Community 100"
Cohesion: 0.16
Nodes (13): PageEditorClient(), Props, dynamic, EditPagePage(), Divider(), Props, RichHtmlEditor(), escapeHtml() (+5 more)

### Community 101 - "Community 101"
Cohesion: 0.21
Nodes (14): back(), callbackUrl(), dynamic, GET(), callbackUrl(), dynamic, GET(), dynamic (+6 more)

### Community 102 - "Community 102"
Cohesion: 0.22
Nodes (13): MyExamsPage(), MyContentPage(), StatCard(), MyExamsList(), pageList(), PagerLink(), Pagination(), BundleGroup (+5 more)

### Community 103 - "Community 103"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 104 - "Community 104"
Cohesion: 0.16
Nodes (16): "Order", Order_paypalCaptureId_key, Order_paypalOrderId_key, Order_userId_status_idx, "BillingAddress", BillingAddress_userId_idx, "EmailTemplate", EmailTemplate_key_key (+8 more)

### Community 105 - "Community 105"
Cohesion: 0.19
Nodes (13): ResultsPage(), ExamRunnerProps, RunnerQuestion, RunnerReference, RunnerResponse, TYPE_HINT, escapeRegex(), ExplanationView() (+5 more)

### Community 106 - "Community 106"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer, eslint, eslint-config-next, eslint-plugin-react-hooks, playwright, postcss, prisma (+8 more)

### Community 107 - "Community 107"
Cohesion: 0.12
Nodes (13): db, MANAGE, MODEL, Opt, PREPARE, QType, QUESTIONS, REGROUND_TAG (+5 more)

### Community 108 - "Community 108"
Cohesion: 0.28
Nodes (10): BlueprintAuthorClient(), submit(), PdfAuthorClient(), submit(), WebAuthorClient(), submit(), consumeSSE(), GenQuestion (+2 more)

### Community 109 - "Community 109"
Cohesion: 0.19
Nodes (15): addQuestion(), autoFillFromWeb(), deleteAllQuestions(), deleteQuestion(), EditExamPage(), Field(), LEVELS, publishAllDrafts() (+7 more)

### Community 110 - "Community 110"
Cohesion: 0.16
Nodes (8): EditorClient(), Props, dynamic, EditTemplatePage(), DEFAULT_TEMPLATES, sampleBrand, TEMPLATE_KEYS, TemplateDefinition

### Community 111 - "Community 111"
Cohesion: 0.21
Nodes (14): "User", User_email_key, "ApiToken", ApiToken_hashedToken_key, "Banner", "ConsentLog", ConsentLog_userId_createdAt_idx, "ExamVersion" (+6 more)

### Community 112 - "Community 112"
Cohesion: 0.20
Nodes (14): nodemailer, AllSettings, buildTransport(), BuiltTransport, cache, getServiceAccountAccessToken(), isTransportConfigured(), primaryTransportKind() (+6 more)

### Community 113 - "Community 113"
Cohesion: 0.23
Nodes (11): Body, POST(), Body, POST(), sendOTPEmail(), issueOtp(), OtpPurpose, verifyOtp() (+3 more)

### Community 114 - "Community 114"
Cohesion: 0.23
Nodes (14): DomainSchema, ExamInfoLookup, extractJsonObject(), extractWithClaude(), findUrlViaAgent(), lookupExamInfo(), preferredDomains(), rankUrls() (+6 more)

### Community 115 - "Community 115"
Cohesion: 0.29
Nodes (10): Bundle, BundleAsExamView(), BundleItem, Row(), Stat(), ExamDetailPage(), Row(), Stat() (+2 more)

### Community 116 - "Community 116"
Cohesion: 0.21
Nodes (10): db, POST(), runtime, AI900_REPLACEMENT, classifyPmpDomain(), fixKnownIssues(), Opt, PMP_ALL_SLUGS (+2 more)

### Community 117 - "Community 117"
Cohesion: 0.18
Nodes (12): check(), concurrency, discover(), enqueue(), failures, maxUrls, origin, queued (+4 more)

### Community 118 - "Community 118"
Cohesion: 0.22
Nodes (6): EmailTemplatesClient(), ExpandedEditor(), RowBlock(), TemplateRow, dynamic, EmailTemplatesPage()

### Community 119 - "Community 119"
Cohesion: 0.19
Nodes (9): PAYMENT_FULFILLMENT_FIELDS, PAYMENT_SUBGROUPS, dynamic, PaymentSettingPage(), Initial, PaymentForm(), Props, renderField() (+1 more)

### Community 120 - "Community 120"
Cohesion: 0.28
Nodes (11): GET(), apiBase(), CreatePaymentInput, createPaymentRequest(), CreatePaymentResult, getEnv(), HitPayEnv, isEnabled() (+3 more)

### Community 121 - "Community 121"
Cohesion: 0.17
Nodes (12): scripts, build, check:links, db:deploy, db:migrate, db:seed, db:studio, dev (+4 more)

### Community 122 - "Community 122"
Cohesion: 0.21
Nodes (9): getGroup(), SettingsGroup, Initial, SectionForm(), COMPANY_FALLBACKS, dynamic, SettingsSectionPage(), VALID_SLUGS (+1 more)

### Community 123 - "Community 123"
Cohesion: 0.27
Nodes (9): POST(), CompanyInfo, decrypt(), encrypt(), key(), setSetting(), SETTING_KEYS, SettingKey (+1 more)

### Community 124 - "Community 124"
Cohesion: 0.23
Nodes (9): dynamic, GET(), maskEmail(), POST(), runtime, canUserReview(), RatingSummary, ReviewInput (+1 more)

### Community 125 - "Community 125"
Cohesion: 0.23
Nodes (7): generateMetadata(), loadPage(), PublicPage(), renderPlaceholders(), revalidate, DEFAULT_PAGES, PageDefault

### Community 126 - "Community 126"
Cohesion: 0.27
Nodes (9): CODES, db, j(), main(), q(), db, j(), main() (+1 more)

### Community 127 - "Community 127"
Cohesion: 0.35
Nodes (8): DELETE(), PATCH(), GET(), POST(), BillingAddressInput, BillingAddressSchema, ensureOwnership(), setDefaultAddress()

### Community 128 - "Community 128"
Cohesion: 0.33
Nodes (6): ExamReviews(), maskEmail(), LandingTestimonials(), RatingStars(), ReviewFormModal(), getExamRatingSummary()

### Community 129 - "Community 129"
Cohesion: 0.27
Nodes (7): ExamRunner(), checkAnswer(), move(), revealAnswer(), setAnswer(), toggle(), NEEDS_CONFIRM()

### Community 130 - "Community 130"
Cohesion: 0.27
Nodes (5): Logo(), Nav(), ThemeToggle(), UserMenu(), ViewAs

### Community 131 - "Community 131"
Cohesion: 0.36
Nodes (9): "PaymentWebhookEvent", PaymentWebhookEvent_provider_eventId_key, PaymentWebhookEvent_provider_receivedAt_idx, PaymentWebhookEvent_status_idx, "Refund", Refund_creditNoteInvoiceId_key, Refund_orderId_idx, Refund_providerRefundId_key (+1 more)

### Community 132 - "Community 132"
Cohesion: 0.38
Nodes (9): "Coupon", Coupon_code_key, Coupon_enabled_startsAt_endsAt_idx, Coupon_scopeExamId_idx, Coupon_scopeVendorId_idx, "CouponRedemption", CouponRedemption_couponId_idx, CouponRedemption_orderId_key (+1 more)

### Community 133 - "Community 133"
Cohesion: 0.39
Nodes (8): "Invoice", Invoice_creditNoteOfId_key, Invoice_issueDate_idx, Invoice_number_key, Invoice_orderId_key, Invoice_status_idx, Invoice_userId_idx, "InvoiceCounter"

### Community 134 - "Community 134"
Cohesion: 0.33
Nodes (7): authorize(), dynamic, GET(), POST(), runtime, notify(), NotifyKind

### Community 135 - "Community 135"
Cohesion: 0.46
Nodes (7): "Review", Review_examId_status_idx, Review_status_createdAt_idx, Review_userId_examId_key, "Testimonial", Testimonial_published_sortOrder_idx, Testimonial_sourceReviewId_key

### Community 136 - "Community 136"
Cohesion: 0.32
Nodes (6): @anthropic-ai/claude-agent-sdk, main(), runSeoAssist(), generateSeoForExam(), Schema, SeoMeta

### Community 137 - "Community 137"
Cohesion: 0.36
Nodes (4): buildUserWhere(), UserFilterParams, validDate(), validUserDate()

### Community 138 - "Community 138"
Cohesion: 0.25
Nodes (4): allIds, crossDupes, db, norm

### Community 139 - "Community 139"
Cohesion: 0.43
Nodes (6): extractInternal(), fetchHtml(), main(), mapPool(), sitemapUrls(), status()

### Community 140 - "Community 140"
Cohesion: 0.32
Nodes (3): Draft, GeneratorClient(), GeneratePage()

### Community 141 - "Community 141"
Cohesion: 0.39
Nodes (7): Code(), dynamic, Ext(), KeyStatus, PaymentGuidePage(), StatusRow(), Step()

### Community 142 - "Community 142"
Cohesion: 0.32
Nodes (5): HIDDEN_PREFIXES, SUGGESTIONS, waLink(), WhatsAppGlyph(), WhatsAppWidget()

### Community 143 - "Community 143"
Cohesion: 0.48
Nodes (6): "Tag", Tag_slug_key, "UserNote", UserNote_userId_createdAt_idx, "UserTag", UserTag_tagId_idx

### Community 144 - "Community 144"
Cohesion: 0.52
Nodes (6): "VoucherInventory", VoucherInventory_assignedEntitlementId_key, VoucherInventory_code_key, VoucherInventory_examId_status_idx, VoucherInventory_status_expiresAt_idx, VoucherInventory_vendorId_status_idx

### Community 145 - "Community 145"
Cohesion: 0.48
Nodes (6): "AdminNotification", AdminNotification_readAt_createdAt_idx, "EmailLog", EmailLog_status_sentAt_idx, EmailLog_template_sentAt_idx, EmailLog_userId_sentAt_idx

### Community 146 - "Community 146"
Cohesion: 0.43
Nodes (4): db, POST(), runtime, fixQuestionCount()

### Community 147 - "Community 147"
Cohesion: 0.48
Nodes (3): @sentry/nextjs, onRouterTransitionStart(), register()

### Community 148 - "Community 148"
Cohesion: 0.43
Nodes (6): Args, db, distributeByWeight(), generateForExam(), main(), parseArgs()

### Community 149 - "Community 149"
Cohesion: 0.43
Nodes (6): cookieHeader(), jar, main(), parseRows(), setCookies(), VENDORS

### Community 150 - "Community 150"
Cohesion: 0.33
Nodes (6): ARCHIVE_BUNDLE_SLUGS, ARCHIVE_EXAM_SLUGS, hasDuplicateOptionIds(), POST(), PUBLISH_ACTIVATE_SLUGS, runtime

### Community 151 - "Community 151"
Cohesion: 0.38
Nodes (3): ResultsSignupPrompt(), Props, TeaserGate()

### Community 152 - "Community 152"
Cohesion: 0.60
Nodes (5): "Bundle", Bundle_slug_key, "BundleItem", BundleItem_bundleId_examId_tier_key, BundleItem_examId_idx

### Community 153 - "Community 153"
Cohesion: 0.53
Nodes (5): CODES, db, j(), main(), q()

### Community 154 - "Community 154"
Cohesion: 0.53
Nodes (5): db, j(), main(), MAP, q()

### Community 155 - "Community 155"
Cohesion: 0.53
Nodes (5): db, j(), main(), MAP, q()

### Community 156 - "Community 156"
Cohesion: 0.53
Nodes (5): CODES, db, j(), main(), q()

### Community 157 - "Community 157"
Cohesion: 0.53
Nodes (5): db, j(), main(), q(), SLUGS

### Community 158 - "Community 158"
Cohesion: 0.53
Nodes (5): CODES, db, j(), main(), q()

### Community 159 - "Community 159"
Cohesion: 0.53
Nodes (5): CODES, db, j(), main(), q()

### Community 160 - "Community 160"
Cohesion: 0.53
Nodes (5): db, j(), main(), q(), SLUGS

### Community 161 - "Community 161"
Cohesion: 0.53
Nodes (5): CODES, db, j(), main(), q()

### Community 162 - "Community 162"
Cohesion: 0.53
Nodes (5): db, GROUPS, j(), main(), q()

### Community 163 - "Community 163"
Cohesion: 0.53
Nodes (5): BUNDLES, db, j(), main(), q()

### Community 164 - "Community 164"
Cohesion: 0.33
Nodes (4): db, m, safeHost, url

### Community 165 - "Community 165"
Cohesion: 0.47
Nodes (5): createBatch(), dynamic, Field(), ManualBatchPage(), requireAdmin()

### Community 166 - "Community 166"
Cohesion: 0.53
Nodes (4): createVendor(), deleteVendor(), requireAdmin(), updateVendor()

### Community 167 - "Community 167"
Cohesion: 0.47
Nodes (4): POST(), runtime, DEAD_TRACK_BUNDLE_SLUGS, fixAwsDeadBundles()

### Community 168 - "Community 168"
Cohesion: 0.33
Nodes (5): ACTIVATE_SLUGS, ARCHIVE_SLUGS, POST(), RowResult, runtime

### Community 169 - "Community 169"
Cohesion: 0.33
Nodes (5): BUNDLES_TO_UNPUBLISH, dynamic, EXAMS_TO_PUBLISH, POST(), runtime

### Community 170 - "Community 170"
Cohesion: 0.47
Nodes (3): BundleCheckoutPage(), Props, TestPaymentButton()

### Community 171 - "Community 171"
Cohesion: 0.40
Nodes (3): handlebarsBrowserBuild, nextConfig, require

### Community 172 - "Community 172"
Cohesion: 0.60
Nodes (3): generateApiToken(), hashToken(), lookupApiToken()

### Community 173 - "Community 173"
Cohesion: 0.70
Nodes (4): db, j(), main(), q()

### Community 175 - "Community 175"
Cohesion: 0.60
Nodes (4): cookieHeader(), jar, main(), setCookies()

### Community 176 - "Community 176"
Cohesion: 0.60
Nodes (4): cookieHeader(), jar, main(), setCookies()

### Community 177 - "Community 177"
Cohesion: 0.50
Nodes (4): createCoupon(), dynamic, Field(), NewCouponPage()

### Community 178 - "Community 178"
Cohesion: 0.50
Nodes (4): AdminPagesPage(), dynamic, seedAction(), seedDefaultPages()

### Community 179 - "Community 179"
Cohesion: 0.50
Nodes (3): TestimonialsAdminClient(), dynamic, TestimonialsAdminPage()

### Community 180 - "Community 180"
Cohesion: 0.50
Nodes (4): csv(), dynamic, GET(), runtime

### Community 181 - "Community 181"
Cohesion: 0.40
Nodes (4): dynamic, KNOWN_LONELY_BASE_SHELLS, POST(), runtime

### Community 182 - "Community 182"
Cohesion: 0.50
Nodes (4): csv(), dynamic, GET(), runtime

### Community 184 - "Community 184"
Cohesion: 0.83
Nodes (3): "Page", Page_showInFooter_footerGroup_position_idx, Page_slug_key

### Community 185 - "Community 185"
Cohesion: 0.83
Nodes (3): "Account", Account_provider_providerAccountId_key, Account_userId_idx

### Community 186 - "Community 186"
Cohesion: 0.67
Nodes (3): db, main(), seedAi900()

### Community 187 - "Community 187"
Cohesion: 0.67
Nodes (3): db, main(), seedAz104()

### Community 188 - "Community 188"
Cohesion: 0.67
Nodes (3): db, main(), seedAz204()

### Community 189 - "Community 189"
Cohesion: 0.67
Nodes (3): db, main(), seedAz305()

### Community 190 - "Community 190"
Cohesion: 0.67
Nodes (3): db, main(), seedCcaFoundations()

### Community 191 - "Community 191"
Cohesion: 0.67
Nodes (3): db, main(), seedCcarProfessional()

### Community 192 - "Community 192"
Cohesion: 0.67
Nodes (3): db, main(), seedCcdvFoundations()

### Community 193 - "Community 193"
Cohesion: 0.67
Nodes (3): db, main(), seedConsul()

### Community 194 - "Community 194"
Cohesion: 0.67
Nodes (3): db, main(), seedCySA()

### Community 195 - "Community 195"
Cohesion: 0.67
Nodes (3): db, main(), seedDca()

### Community 196 - "Community 196"
Cohesion: 0.67
Nodes (3): db, main(), seedDp600()

### Community 197 - "Community 197"
Cohesion: 0.67
Nodes (3): db, main(), seedGcpPca()

### Community 198 - "Community 198"
Cohesion: 0.67
Nodes (3): db, main(), seedGcpPcdoe()

### Community 199 - "Community 199"
Cohesion: 0.67
Nodes (3): db, main(), seedGcpPcne()

### Community 200 - "Community 200"
Cohesion: 0.67
Nodes (3): db, main(), seedGcpPde()

### Community 201 - "Community 201"
Cohesion: 0.67
Nodes (3): db, main(), seedGitlab()

### Community 202 - "Community 202"
Cohesion: 0.67
Nodes (3): db, main(), seedJava17()

### Community 203 - "Community 203"
Cohesion: 0.67
Nodes (3): db, main(), seedKcna()

### Community 204 - "Community 204"
Cohesion: 0.67
Nodes (3): db, main(), seedKcsa()

### Community 205 - "Community 205"
Cohesion: 0.67
Nodes (3): db, main(), seedMd102()

### Community 206 - "Community 206"
Cohesion: 0.67
Nodes (3): db, main(), seedMs102()

### Community 207 - "Community 207"
Cohesion: 0.67
Nodes (3): db, main(), seedMs700()

### Community 208 - "Community 208"
Cohesion: 0.67
Nodes (3): db, main(), seedOciFoundations()

### Community 209 - "Community 209"
Cohesion: 0.67
Nodes (3): db, main(), seedPl300()

### Community 210 - "Community 210"
Cohesion: 0.67
Nodes (3): db, main(), seedPl600()

### Community 211 - "Community 211"
Cohesion: 0.67
Nodes (3): db, main(), seedSapC02()

### Community 212 - "Community 212"
Cohesion: 0.67
Nodes (3): db, main(), seedSc100()

### Community 213 - "Community 213"
Cohesion: 0.67
Nodes (3): db, main(), seedSc200()

### Community 214 - "Community 214"
Cohesion: 0.67
Nodes (3): db, main(), seedSc300()

### Community 215 - "Community 215"
Cohesion: 0.67
Nodes (3): db, main(), seedSc900()

### Community 216 - "Community 216"
Cohesion: 0.67
Nodes (3): db, main(), seedSoaC03()

### Community 217 - "Community 217"
Cohesion: 0.67
Nodes (3): db, main(), seedTableauDs()

### Community 218 - "Community 218"
Cohesion: 0.67
Nodes (3): db, main(), seedTerraform()

### Community 219 - "Community 219"
Cohesion: 0.67
Nodes (3): db, main(), seedVault()

### Community 226 - "Community 226"
Cohesion: 0.67
Nodes (3): AdminTestExamPage(), Row(), startTestAttempt()

### Community 227 - "Community 227"
Cohesion: 0.67
Nodes (3): createExam(), Field(), NewExamPage()

### Community 228 - "Community 228"
Cohesion: 0.50
Nodes (3): dynamic, GET(), runtime

### Community 229 - "Community 229"
Cohesion: 0.67
Nodes (3): POST(), runtime, regroundPl300()

### Community 230 - "Community 230"
Cohesion: 0.67
Nodes (3): POST(), runtime, topupGcpPmle()

### Community 231 - "Community 231"
Cohesion: 0.67
Nodes (3): Body, POST(), shuffle()

### Community 232 - "Community 232"
Cohesion: 0.50
Nodes (3): Body, dynamic, POST()

### Community 233 - "Community 233"
Cohesion: 0.50
Nodes (3): DELETE(), dynamic, runtime

## Knowledge Gaps
- **18 isolated node(s):** `{ GET, POST }`, `autoprefixer`, `class-variance-authority`, `@hookform/resolvers`, `playwright` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 4288 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 20` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 80`, `Community 81`, `Community 83`, `Community 85`, `Community 87`, `Community 88`, `Community 90`, `Community 92`, `Community 93`, `Community 94`, `Community 96`, `Community 97`, `Community 99`, `Community 102`, `Community 107`, `Community 110`, `Community 116`, `Community 126`, `Community 137`, `Community 138`, `Community 146`, `Community 148`, `Community 153`, `Community 154`, `Community 155`, `Community 156`, `Community 157`, `Community 158`, `Community 159`, `Community 160`, `Community 161`, `Community 162`, `Community 163`, `Community 164`, `Community 167`, `Community 173`, `Community 177`, `Community 186`, `Community 187`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 193`, `Community 194`, `Community 195`, `Community 196`, `Community 197`, `Community 198`, `Community 199`, `Community 200`, `Community 201`, `Community 202`, `Community 203`, `Community 204`, `Community 205`, `Community 206`, `Community 207`, `Community 208`, `Community 209`, `Community 210`, `Community 211`, `Community 212`, `Community 213`, `Community 214`, `Community 215`, `Community 216`, `Community 217`, `Community 218`, `Community 219`, `Community 220`, `Community 224`, `Community 225`, `Community 243`?**
  _High betweenness centrality (0.625) - this node is a cross-community bridge._
- **What connects `{ GET, POST }`, `autoprefixer`, `class-variance-authority` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.011695906432748537 - nodes in this community are weakly interconnected._
- **Why does `auth` connect `Community 3` to `Community 128`, `Community 102`, `Community 134`, `Community 136`, `Community 8`, `Community 10`, `Community 141`, `Community 13`, `Community 232`, `Community 105`, `Community 146`, `Community 233`, `Community 150`, `Community 25`, `Community 28`, `Community 33`, `Community 34`, `Community 165`, `Community 166`, `Community 167`, `Community 40`, `Community 168`, `Community 169`, `Community 170`, `Community 177`, `Community 178`, `Community 179`, `Community 180`, `Community 181`, `Community 182`, `Community 60`, `Community 63`, `Community 65`, `Community 68`, `Community 72`, `Community 73`, `Community 79`, `Community 80`, `Community 85`, `Community 90`, `Community 92`, `Community 94`, `Community 96`, `Community 97`, `Community 226`, `Community 227`, `Community 100`, `Community 98`, `Community 228`, `Community 229`, `Community 230`, `Community 101`, `Community 231`, `Community 235`, `Community 236`, `Community 109`, `Community 110`, `Community 237`, `Community 238`, `Community 239`, `Community 240`, `Community 241`, `Community 116`, `Community 242`, `Community 118`, `Community 119`, `Community 243`, `Community 115`, `Community 122`, `Community 123`, `Community 124`, `Community 127`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.015151515151515152 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Community 34` to `Community 3`, `Community 8`, `Community 10`, `Community 13`, `Community 19`, `Community 25`, `Community 28`, `Community 33`, `Community 40`, `Community 60`, `Community 63`, `Community 65`, `Community 68`, `Community 69`, `Community 72`, `Community 73`, `Community 80`, `Community 84`, `Community 85`, `Community 86`, `Community 89`, `Community 90`, `Community 92`, `Community 94`, `Community 95`, `Community 96`, `Community 97`, `Community 98`, `Community 100`, `Community 101`, `Community 102`, `Community 105`, `Community 109`, `Community 110`, `Community 113`, `Community 115`, `Community 116`, `Community 118`, `Community 119`, `Community 120`, `Community 122`, `Community 123`, `Community 124`, `Community 125`, `Community 127`, `Community 128`, `Community 130`, `Community 134`, `Community 140`, `Community 141`, `Community 142`, `Community 146`, `Community 150`, `Community 151`, `Community 165`, `Community 166`, `Community 167`, `Community 168`, `Community 169`, `Community 170`, `Community 177`, `Community 178`, `Community 179`, `Community 180`, `Community 181`, `Community 182`, `Community 226`, `Community 227`, `Community 228`, `Community 229`, `Community 230`, `Community 231`, `Community 232`, `Community 233`, `Community 235`, `Community 236`, `Community 237`, `Community 238`, `Community 239`, `Community 240`, `Community 241`, `Community 242`, `Community 243`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.018867924528301886 - nodes in this community are weakly interconnected._