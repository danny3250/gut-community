drop policy if exists "Users can insert their own policy acceptances" on public.user_policy_acceptances;
create policy "Users can insert their own policy acceptances"
  on public.user_policy_acceptances
  for insert
  with check (auth.uid() = user_id);
