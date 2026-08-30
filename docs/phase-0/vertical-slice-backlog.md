# First production vertical slice

The first slice proves one organisation can coordinate one multi-component case
without cross-tenant access or status ambiguity.

1. Resolve the authenticated user's active organisation membership.
2. Create a draft case for one traveller.
3. Add flight, accommodation and transfer components.
4. Submit the case and create the billable submission event exactly once.
5. Record approval separately from authority to proceed.
6. Upload and supersede a classified supporting document.
7. Assign providers and record external references without GDS access.
8. Move the case through coordination, ready-to-travel and completion.
9. Demonstrate that another tenant receives not found for every case resource.
10. Export the chronological evidence trail.

Exit requires UI, API, database and audit evidence for the entire flow, plus a
tested rollback path and explicit product-owner acceptance.

