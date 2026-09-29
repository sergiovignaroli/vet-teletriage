-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "onboardingCompletado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN     "onboardingCompletado" BOOLEAN NOT NULL DEFAULT false;
