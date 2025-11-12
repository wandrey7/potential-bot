import cron from "node-cron";
import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

export class CleanupService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  async resetDailyLimits() {
    if (this.isRunning) {
      appLogger.warn("Daily cleanup already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      appLogger.info("Starting daily limits cleanup...");

      const result = await prisma.userGroup.updateMany({
        data: {
          roulettes: 0,
          stoleToday: false,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      appLogger.info("Daily cleanup completed successfully %o", {
        registrosAtualizados: result.count,
        duracao: `${duration}ms`,
        horarioExecucao: new Date().toISOString(),
      });

      appLogger.info(
        `✅ Cleanup completed: ${
          result.count
        } records reset at ${new Date().toLocaleString("pt-BR")}`
      );
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      appLogger.error("❌ Error in daily cleanup %o", {
        error: error.message,
        stack: error.stack,
        duracao: `${duration}ms`,
        horarioErro: new Date().toISOString(),
      });

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  startSchedule() {
    try {
      if (this.cronJob) {
        this.cronJob.stop();
        appLogger.info("Previous cron job stopped");
      }

      this.cronJob = cron.schedule(
        "0 0 * * *",
        async () => {
          appLogger.info("Cron job executing scheduled daily cleanup...");

          try {
            await this.resetDailyLimits();
          } catch (error) {
            appLogger.error("❌ Cron job cleanup failed %o", {
              error: error.message,
              stack: error.stack,
            });
          }
        },
        {
          timezone: "America/Sao_Paulo",
        }
      );

      appLogger.info(
        "✅ Cleanup service scheduled to run daily at 00:00 (São Paulo time)"
      );

      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(now.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      appLogger.info(
        `📅 Next scheduled execution: ${nextMidnight.toLocaleString("pt-BR")}`
      );
    } catch (error) {
      appLogger.error("❌ Error starting cleanup schedule %o", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  stopSchedule() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      appLogger.info("⏹️ Cleanup schedule stopped");
    }
  }

  async testCleanup() {
    appLogger.info("🧪 Starting manual cleanup test...");

    try {
      await this.resetDailyLimits();
      appLogger.info("✅ Manual cleanup test completed successfully");
      return { success: true, message: "Cleanup tested successfully" };
    } catch (error) {
      appLogger.error("❌ Manual cleanup test failed %o", {
        error: error.message,
        stack: error.stack,
      });
      return { success: false, message: error.message };
    }
  }

  getStatus() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);

    return {
      isRunning: this.isRunning,
      hasSchedule: this.cronJob !== null,
      nextExecution: this.cronJob ? nextMidnight : null,
    };
  }
}

export const cleanupService = new CleanupService();

export const initializeCleanupService = async () => {
  try {
    appLogger.info("🔧 Initializing automatic cleanup service...");

    await prisma.$queryRaw`SELECT 1`;
    appLogger.info("✅ Database connection verified");

    cleanupService.startSchedule();

    appLogger.info("🚀 Automatic cleanup service initialized successfully");
    return true;
  } catch (error) {
    appLogger.error("❌ Failed to initialize cleanup service %o", {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};
