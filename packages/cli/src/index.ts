#!/usr/bin/env node
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { config as loadEnv } from 'dotenv';
import {
  IngestionService,
  LeaderboardService,
  type TournamentLeaderboardResponse,
  type EventLeaderboardResponse,
  type ArcherProfileResponse,
  type CanonicalInspectionResult,
  type SuspiciousCanonicalProfile
} from '@archeryleague/core';

loadEnv();

const program = new Command();
program
  .name('archeryleague')
  .description('ArcheryLeague league tracker CLI')
  .version('0.1.0');

const ingestionService = new IngestionService();
const leaderboardService = new LeaderboardService();

program
  .command('sync:tournament')
  .alias('sync-tournament')
  .argument('<tournamentId>', 'Tournament identifier from Results API')
  .description('Ingest tournament metadata, events, participants, and scores')
  .action(async (tournamentIdText: string) => {
    const tournamentId = Number.parseInt(tournamentIdText, 10);
    if (Number.isNaN(tournamentId)) {
      throw new Error('tournamentId must be numeric');
    }

    const spinner = ora(`Synchronising tournament ${tournamentId}…`).start();
    try {
      const result = await ingestionService.syncTournament(tournamentId);
      spinner.succeed(
        `Tournament ${tournamentId} synced (${result.eventIds.length} events processed)`
      );
    } catch (error) {
      spinner.fail(`Failed to sync tournament ${tournamentId}`);
      handleError(error);
    }
  });

program
  .command('sync:event')
  .alias('sync-event')
  .argument('<eventId>', 'Event identifier from Results API')
  .option('-t, --tournament <tournamentId>', 'Override tournament identifier')
  .description('Ingest a single event including categories, participants, and scores')
  .action(async (eventIdText: string, options: { tournament?: string }) => {
    const eventId = Number.parseInt(eventIdText, 10);
    if (Number.isNaN(eventId)) {
      throw new Error('eventId must be numeric');
    }

    const tournamentId = options.tournament ? Number.parseInt(options.tournament, 10) : undefined;
    const spinner = ora(`Synchronising event ${eventId}…`).start();
    try {
      const result = await ingestionService.syncEvent(eventId, { tournamentId });
      spinner.succeed(
        `Event ${eventId} synced (${result.participants} participants, ${result.scores} scores)`
      );
    } catch (error) {
      spinner.fail(`Failed to sync event ${eventId}`);
      handleError(error);
    }
  });

program
  .command('delete:tournament')
  .alias('delete-tournament')
  .argument('<tournamentId>', 'Tournament identifier')
  .description('Delete a tournament and all related events, participants, categories, and scores')
  .action(async (tournamentIdText: string) => {
    const tournamentId = Number.parseInt(tournamentIdText, 10);
    if (Number.isNaN(tournamentId)) {
      throw new Error('tournamentId must be numeric');
    }

    const spinner = ora(`Deleting tournament ${tournamentId}…`).start();
    try {
      const result = await ingestionService.deleteTournament(tournamentId);
      if (!result.existed) {
        spinner.warn(`Tournament ${tournamentId} does not exist`);
        return;
      }

      spinner.succeed(
        `Tournament ${tournamentId} deleted (${result.deletedEvents} events, ${result.deletedParticipants} participants, ${result.deletedScores} scores)`
      );
    } catch (error) {
      spinner.fail(`Failed to delete tournament ${tournamentId}`);
      handleError(error);
    }
  });

program
  .command('canonical:inspect')
  .argument('<canonicalArcherId>', 'Canonical archer identifier')
  .description('Inspect a canonical profile and its linked archers')
  .action(async (canonicalArcherIdText: string) => {
    const canonicalArcherId = Number.parseInt(canonicalArcherIdText, 10);
    if (Number.isNaN(canonicalArcherId)) {
      throw new Error('canonicalArcherId must be numeric');
    }

    const spinner = ora('Inspecting canonical profile…').start();
    try {
      const inspection = await ingestionService.inspectCanonicalArcher(canonicalArcherId);
      spinner.stop();
      printCanonicalInspection(inspection);
    } catch (error) {
      spinner.fail('Unable to inspect canonical profile');
      handleError(error);
    }
  });

program
  .command('canonical:link')
  .argument('<archerId>', 'Archer identifier')
  .argument('<canonicalArcherId>', 'Canonical archer identifier')
  .description('Manually link an archer record to a canonical profile')
  .action(async (archerIdText: string, canonicalArcherIdText: string) => {
    const archerId = Number.parseInt(archerIdText, 10);
    const canonicalArcherId = Number.parseInt(canonicalArcherIdText, 10);
    if (Number.isNaN(archerId) || Number.isNaN(canonicalArcherId)) {
      throw new Error('archerId and canonicalArcherId must be numeric');
    }

    const spinner = ora(`Linking archer ${archerId} to canonical profile ${canonicalArcherId}…`).start();
    try {
      const result = await ingestionService.assignArcherToCanonical(archerId, canonicalArcherId);
      spinner.succeed(
        `Linked archer ${result.archerId} to canonical ${result.canonicalArcherId} (${result.linkMethod})`
      );
    } catch (error) {
      spinner.fail(`Failed to link archer ${archerId}`);
      handleError(error);
    }
  });

program
  .command('canonical:unlink')
  .argument('<archerId>', 'Archer identifier')
  .description('Detach an archer record from its current canonical profile')
  .action(async (archerIdText: string) => {
    const archerId = Number.parseInt(archerIdText, 10);
    if (Number.isNaN(archerId)) {
      throw new Error('archerId must be numeric');
    }

    const spinner = ora(`Detaching archer ${archerId} from canonical profile…`).start();
    try {
      const result = await ingestionService.detachArcherFromCanonical(archerId);
      if (!result.detached) {
        spinner.warn(`Archer ${archerId} was not linked to a canonical profile`);
        return;
      }
      spinner.succeed(
        `Detached archer ${result.archerId} from canonical ${result.previousCanonicalArcherId}`
      );
    } catch (error) {
      spinner.fail(`Failed to detach archer ${archerId}`);
      handleError(error);
    }
  });

program
  .command('canonical:suspicious')
  .description('List canonical profiles that may need manual review')
  .action(async () => {
    const spinner = ora('Scanning canonical profiles…').start();
    try {
      const suspicious = await ingestionService.listSuspiciousCanonicalArchers();
      spinner.stop();
      printSuspiciousCanonicalProfiles(suspicious);
    } catch (error) {
      spinner.fail('Unable to scan canonical profiles');
      handleError(error);
    }
  });

program
  .command('leaderboard:tournament')
  .alias('leaderboard-tournament')
  .argument('<tournamentId>', 'Tournament identifier')
  .option('-l, --limit <rows>', 'Number of rows to display', '20')
  .description('Display the aggregated leaderboard for a tournament')
  .action(async (tournamentIdText: string, options: { limit: string }) => {
    const tournamentId = Number.parseInt(tournamentIdText, 10);
    const limit = Math.max(1, Number.parseInt(options.limit, 10));
    const spinner = ora('Building leaderboard…').start();

    try {
      const leaderboard = await leaderboardService.getTournamentLeaderboard(tournamentId);
      spinner.stop();
      printTournamentLeaderboard(leaderboard, limit);
    } catch (error) {
      spinner.fail('Unable to fetch leaderboard');
      handleError(error);
    }
  });

program
  .command('leaderboard:event')
  .alias('leaderboard-event')
  .argument('<eventId>', 'Event identifier')
  .description('Display category leaderboards for a single event')
  .action(async (eventIdText: string) => {
    const eventId = Number.parseInt(eventIdText, 10);
    const spinner = ora('Building event leaderboard…').start();

    try {
      const leaderboard = await leaderboardService.getEventLeaderboard(eventId);
      spinner.stop();
      printEventLeaderboard(leaderboard);
    } catch (error) {
      spinner.fail('Unable to fetch event leaderboard');
      handleError(error);
    }
  });

program
  .command('archer')
  .argument('<archerId>', 'Archer identifier')
  .option('-t, --tournament <tournamentId>', 'Restrict statistics to a tournament')
  .description('Show cumulative statistics for an archer')
  .action(async (archerIdText: string, options: { tournament?: string }) => {
    const archerId = Number.parseInt(archerIdText, 10);
    const tournamentId = options.tournament ? Number.parseInt(options.tournament, 10) : undefined;
    const spinner = ora('Fetching archer profile…').start();

    try {
      const profile = await leaderboardService.getArcherProfile(archerId, tournamentId);
      spinner.stop();
      printArcherProfile(profile);
    } catch (error) {
      spinner.fail('Unable to fetch archer profile');
      handleError(error);
    }
  });

program.parseAsync(process.argv).catch(handleError);

function printTournamentLeaderboard(
  data: TournamentLeaderboardResponse,
  limit: number
): void {
  console.log(chalk.bold(`\n${data.tournament.name} — Leaderboard`));
  const table = new Table({
    head: ['Rank', 'Archer', 'Total', '10s', 'Xs', 'Events', 'Trend'],
    style: { head: ['cyan'] }
  });

  for (const entry of data.leaderboard.slice(0, limit)) {
    table.push([
      entry.rank,
      entry.fullName,
      entry.totals.total,
      entry.totals.tens,
      entry.totals.xCount,
      entry.eventsShot,
      formatTrend(entry.trend)
    ]);
  }

  console.log(table.toString());
}

function printEventLeaderboard(data: EventLeaderboardResponse): void {
  console.log(chalk.bold(`\n${data.event.tournamentName ?? ''} — ${data.event.name}`));
  for (const category of data.categories) {
    console.log(chalk.cyan(`\n${category.categoryName}`));
    const table = new Table({
      head: ['Rank', 'Archer', 'Total', '10s', 'Xs', 'Score'],
      style: { head: ['cyan'] }
    });

    for (const score of category.scores) {
      table.push([
        score.ranking ?? '-',
        score.fullName,
        score.total,
        score.tens,
        score.xCount,
        score.rawScore
      ]);
    }

    console.log(table.toString());
  }
}

function printArcherProfile(data: ArcherProfileResponse): void {
  console.log(chalk.bold(`\n${data.archer.firstName} ${data.archer.lastName}`));
  console.log(`Condition: ${data.archer.conditionCode ?? '—'}`);
  console.log(`Team: ${data.archer.team ?? '—'}`);
  console.log(`Events: ${data.totals.eventsShot} | Average: ${data.totals.average.toFixed(1)}`);

  const table = new Table({
    head: ['Event', 'Total', 'Rank', 'Category', 'Score'],
    style: { head: ['cyan'] }
  });

  for (const event of data.events) {
    table.push([
      `${event.tournamentName} / ${event.eventName}`,
      event.total,
      event.ranking ?? '-',
      event.categoryName ?? '—',
      event.rawScore
    ]);
  }

  console.log(table.toString());
}

function printCanonicalInspection(data: CanonicalInspectionResult): void {
  const name = `${data.canonicalArcher.primaryFirstName ?? ''} ${data.canonicalArcher.primaryLastName ?? ''}`.trim();
  console.log(chalk.bold(`\nCanonical #${data.canonicalArcher.id} — ${name || 'Unknown'}`));
  console.log(`Normalized key: ${data.canonicalArcher.normalizedKey}`);
  console.log(`Primary team: ${data.canonicalArcher.primaryTeam ?? '—'}`);
  console.log(
    `Linked archers: ${data.canonicalArcher.linkedArchers} | Scores: ${data.canonicalArcher.totalScores} | Tournaments: ${data.canonicalArcher.tournamentsShot}`
  );

  const table = new Table({
    head: ['Archer ID', 'Name', 'Team', 'Condition', 'Events', 'Link Method', 'Updated'],
    style: { head: ['cyan'] }
  });

  for (const archer of data.archers) {
    table.push([
      archer.id,
      `${archer.firstName} ${archer.lastName}`.trim(),
      archer.team ?? '—',
      archer.conditionCode ?? '—',
      archer.eventsShot,
      archer.canonicalLinkMethod ?? '—',
      formatDateTime(archer.canonicalLinkUpdatedAt)
    ]);
  }

  console.log(table.toString());
}

function printSuspiciousCanonicalProfiles(rows: SuspiciousCanonicalProfile[]): void {
  if (rows.length === 0) {
    console.log(chalk.green('\nNo suspicious canonical profiles found.'));
    return;
  }

  const table = new Table({
    head: ['Canonical ID', 'Name', 'Linked', 'Teams', 'Reasons'],
    style: { head: ['cyan'] }
  });

  for (const row of rows) {
    table.push([
      row.canonicalArcherId,
      row.displayName,
      row.linkedArchers,
      row.teams.length > 0 ? row.teams.join(', ') : '—',
      row.reasons.join('; ')
    ]);
  }

  console.log(chalk.bold('\nSuspicious Canonical Profiles'));
  console.log(table.toString());
}

function formatTrend(trend: number | null): string {
  if (trend === null) {
    return '—';
  }

  if (trend === 0) {
    return chalk.gray('0');
  }

  const color = trend > 0 ? chalk.green : chalk.red;
  const sign = trend > 0 ? '+' : '';
  return color(`${sign}${trend}`);
}

function formatDateTime(value: Date | null): string {
  return value ? value.toISOString() : '—';
}

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  if (error instanceof Error && error.stack) {
    console.error(chalk.gray(error.stack));
  }
  process.exitCode = 1;
  throw error instanceof Error ? error : new Error(message);
}
