import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { SchedulerGateway } from "../../domain/ports/scheduler-gateway.js";
import { Schedule } from "../../domain/model/schedule.js";

export class BullMQSchedulerGateway implements SchedulerGateway {
  private readonly monitorQueue: Queue;
  private readonly reportQueue: Queue;

  constructor(private readonly redisConnection: Redis) {
    // Configuriamo le code per BullMQ condividendo la connessione Redis
    this.monitorQueue = new Queue("monitor-checks", {
      connection: redisConnection as any,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });

    this.reportQueue = new Queue("report-generations", {
      connection: redisConnection as any,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  }

  public async schedule(schedule: Schedule): Promise<void> {
    const { targetId, targetType, cron, intervalSeconds, isActive } = schedule;

    // Rimuoviamo preventivamente qualsiasi pianificazione esistente per questo target
    await this.unschedule(targetId, targetType);

    // Se lo schedule non è attivo, non facciamo nient'altro
    if (!isActive) {
      return;
    }

    const queue = this.getQueueForType(targetType);

    const repeatOpts: any = {
      jobId: targetId,
    };

    if (cron) {
      repeatOpts.pattern = cron;
    } else if (intervalSeconds) {
      repeatOpts.every = intervalSeconds * 1000;
    } else {
      throw new Error(`Schedule ${schedule.id.toString()} has neither cron nor intervalSeconds defined.`);
    }

    // Aggiungiamo il job ripetibile
    // Il nome del job è targetId, i dati contengono targetId e targetType
    await queue.add(
      targetId,
      { targetId, targetType },
      { repeat: repeatOpts }
    );
  }

  public async unschedule(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<void> {
    const queue = this.getQueueForType(targetType);

    // Otteniamo tutti i repeatable jobs registrati in questa coda
    const repeatableJobs = await queue.getRepeatableJobs();

    // Troviamo quelli associati a questo targetId (BullMQ usa jobId o name)
    const targetJobs = repeatableJobs.filter(
      (job) => job.id === targetId || job.name === targetId
    );

    // Rimuoviamo ogni job ripetibile trovato usando la sua key univoca
    for (const job of targetJobs) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  /**
   * Chiude le code per pulizia risorse (utile nei test e allo shutdown del server)
   */
  public async close(): Promise<void> {
    await Promise.all([
      this.monitorQueue.close(),
      this.reportQueue.close(),
    ]);
  }

  private getQueueForType(targetType: "MONITOR" | "REPORT"): Queue {
    return targetType === "MONITOR" ? this.monitorQueue : this.reportQueue;
  }
}
