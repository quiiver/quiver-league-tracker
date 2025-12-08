import { z } from 'zod';

export const TournamentEventSummarySchema = z.object({
  id: z.number(),
  display_order: z.number().optional().nullable(),
  event_type: z.string().optional().nullable(),
  event_name: z.string(),
  msg: z.string().optional().nullable(),
  msg_link: z.string().optional().nullable()
});

export const TournamentResponseSchema = z.object({
  id: z.number(),
  tournament_name: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  updated_at: z.string().nullable(),
  events: z.array(TournamentEventSummarySchema)
});

const EventCategorySchema = z.object({
  nm: z.string(),
  dor: z.number().optional().nullable(),
  ars: z.array(z.object({ aid: z.number() })),
  cut: z.number().optional().nullable()
});

const EventParticipantSchema = z.object({
  aid: z.number(),
  fnm: z.string(),
  lnm: z.string(),
  tgt: z.array(z.string()).optional().default([]),
  tnl: z.array(z.number()).optional().default([]),
  cnd: z.string().optional().nullable(),
  tm: z.string().optional().nullable(),
  alt: z.string().optional().nullable(),
  rtl: z.string().optional().nullable(),
  tbs: z.string().optional().nullable()
});

export const EventResponseSchema = z.object({
  enm: z.string(),
  etp: z.string().optional().nullable(),
  dor: z.number().optional().nullable(),
  cgs: z.array(EventCategorySchema),
  rps: z.record(z.coerce.string(), EventParticipantSchema),
  tnm: z.string().optional().nullable(),
  tdt: z.string().optional().nullable(),
  tlc: z.string().optional().nullable(),
  nos: z.number().optional().nullable()
});

export const ScoresResponseSchema = z.object({
  ars: z.record(z.coerce.string(), z.string())
});

export type TournamentResponse = z.infer<typeof TournamentResponseSchema>;
export type TournamentEventSummary = z.infer<typeof TournamentEventSummarySchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;
export type ScoresResponse = z.infer<typeof ScoresResponseSchema>;

export type EventParticipantRecord = z.infer<typeof EventParticipantSchema>;
export type EventCategoryRecord = z.infer<typeof EventCategorySchema>;
