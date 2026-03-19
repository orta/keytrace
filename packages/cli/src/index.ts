#!/usr/bin/env node
import { program } from "commander";
import { loginCommand } from "./commands/login.js";
import { claimCommand } from "./commands/claim.js";

program
  .name("kt")
  .description("keytrace CLI — create and self-sign identity claims on ATProto")
  .version("0.1.0");

program
  .command("login")
  .description("Log in with your Bluesky app password and upload public keys")
  .action(() => loginCommand());

program
  .command("claim [provider]")
  .description(
    "Create a self-signed identity claim (provider: github, dns, bsky, npm, pgp, twitter, linkedin, instagram, reddit, hackernews, tangled, activitypub)",
  )
  .action((provider?: string) => claimCommand(provider));

program.parse();
