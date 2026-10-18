-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('INGRESADO', 'EVALUADO', 'PENDIENTE_REVISION', 'EN_REVISION', 'RESUELTO', 'VENCIDO_ESCALADO');

-- CreateEnum
CREATE TYPE "EstadoDecision" AS ENUM ('APROBADO_AUTOMATICO', 'DERIVADO_REVISION_ASISTIDA');

-- CreateEnum
CREATE TYPE "SugerenciaMIRA" AS ENUM ('APROBAR', 'RECHAZAR', 'SOLICITAR_ANTECEDENTES');

-- CreateEnum
CREATE TYPE "CausalDerivacion" AS ENUM ('FRAUDE', 'MINIMO_SENAL', 'PUNTAJE_INSUFICIENTE', 'NINGUNA');

-- CreateEnum
CREATE TYPE "NivelPrioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoDecisionOperador" AS ENUM ('APROBADO', 'RECHAZADO', 'SOLICITAR_ANTECEDENTES');

-- CreateEnum
CREATE TYPE "RolOperador" AS ENUM ('LIQUIDADOR', 'SUPERVISOR', 'ADMIN_RIESGO');

-- CreateTable organizaciones
CREATE TABLE "organizaciones" (
    "idOrganizacion" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("idOrganizacion")
);

-- CreateTable flujos
CREATE TABLE "flujos" (
    "idFlujo" TEXT NOT NULL,
    "idOrganizacion" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flujos_pkey" PRIMARY KEY ("idFlujo")
);

-- CreateTable umbrales
CREATE TABLE "umbrales" (
    "idUmbral" TEXT NOT NULL,
    "idFlujo" TEXT NOT NULL,
    "valorAprobacion" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "minimoBasalSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "umbrales_pkey" PRIMARY KEY ("idUmbral")
);

-- CreateTable auditorias_umbral
CREATE TABLE "auditorias_umbral" (
    "idAuditoria" TEXT NOT NULL,
    "idFlujo" TEXT NOT NULL,
    "valorAprobacionAnterior" DOUBLE PRECISION NOT NULL,
    "valorAprobacionNuevo" DOUBLE PRECISION NOT NULL,
    "minimoBasalAnterior" DOUBLE PRECISION NOT NULL,
    "minimoBasalNuevo" DOUBLE PRECISION NOT NULL,
    "usuarioModificador" TEXT NOT NULL,
    "fechaModificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_umbral_pkey" PRIMARY KEY ("idAuditoria")
);

-- CreateTable operadores
CREATE TABLE "operadores" (
    "idOperador" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "rol" "RolOperador" NOT NULL DEFAULT 'LIQUIDADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operadores_pkey" PRIMARY KEY ("idOperador")
);

-- CreateTable casos
CREATE TABLE "casos" (
    "idCaso" TEXT NOT NULL,
    "idFlujo" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puntajeConfianza" DOUBLE PRECISION NOT NULL,
    "estadoCaso" "EstadoCaso" NOT NULL DEFAULT 'INGRESADO',
    "estadoDecision" "EstadoDecision" NOT NULL,
    "sugerenciaMIRA" "SugerenciaMIRA" NOT NULL,
    "razonDerivacion" TEXT,
    "causalDerivacion" "CausalDerivacion" NOT NULL DEFAULT 'NINGUNA',
    "fechaVencimientoSLA" TIMESTAMP(3) NOT NULL,
    "nivelPrioridad" "NivelPrioridad" NOT NULL DEFAULT 'MEDIA',
    "esFacturable" BOOLEAN NOT NULL DEFAULT false,
    "rutTitular" TEXT,
    "nombreTitular" TEXT,
    "hashTitular" TEXT,
    "esAnonimizado" BOOLEAN NOT NULL DEFAULT false,
    "operadorBloqueoId" TEXT,
    "bloqueoExpiracion" TIMESTAMP(3),

    CONSTRAINT "casos_pkey" PRIMARY KEY ("idCaso")
);

-- CreateTable evidencias
CREATE TABLE "evidencias" (
    "idEvidencia" TEXT NOT NULL,
    "idCaso" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "urlAlmacenamiento" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "esLegible" BOOLEAN NOT NULL DEFAULT true,
    "motivoIlegibilidad" TEXT,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("idEvidencia")
);

-- CreateTable senales
CREATE TABLE "senales" (
    "idSenal" TEXT NOT NULL,
    "idCaso" TEXT NOT NULL,
    "idEvidencia" TEXT,
    "tipoSenal" TEXT NOT NULL,
    "moduloOrigen" TEXT NOT NULL,
    "puntaje" DOUBLE PRECISION NOT NULL,
    "pesoPonderacion" DOUBLE PRECISION NOT NULL,
    "umbralMinimo" DOUBLE PRECISION,
    "cumpleMinimo" BOOLEAN NOT NULL DEFAULT true,
    "esAlertaFraude" BOOLEAN NOT NULL DEFAULT false,
    "resultado" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ubicacionHallazgo" JSONB,

    CONSTRAINT "senales_pkey" PRIMARY KEY ("idSenal")
);

-- CreateTable decisiones
CREATE TABLE "decisiones" (
    "idDecision" TEXT NOT NULL,
    "idCaso" TEXT NOT NULL,
    "idOperador" TEXT NOT NULL,
    "tipoDecision" "TipoDecisionOperador" NOT NULL,
    "justificacion" TEXT NOT NULL,
    "fechaDecision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marcaDiscrepancia" BOOLEAN NOT NULL DEFAULT false,
    "esInalterable" BOOLEAN NOT NULL DEFAULT true,
    "ipOperador" TEXT,

    CONSTRAINT "decisiones_pkey" PRIMARY KEY ("idDecision")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_rut_key" ON "organizaciones"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "umbrales_idFlujo_key" ON "umbrales"("idFlujo");

-- CreateIndex
CREATE UNIQUE INDEX "operadores_email_key" ON "operadores"("email");

-- CreateIndex
CREATE INDEX "casos_estadoCaso_nivelPrioridad_fechaVencimientoSLA_idx" ON "casos"("estadoCaso", "nivelPrioridad", "fechaVencimientoSLA");

-- CreateIndex
CREATE INDEX "senales_idCaso_esAlertaFraude_idx" ON "senales"("idCaso", "esAlertaFraude");

-- CreateIndex
CREATE UNIQUE INDEX "decisiones_idCaso_key" ON "decisiones"("idCaso");

-- AddForeignKey
ALTER TABLE "flujos" ADD CONSTRAINT "flujos_idOrganizacion_fkey" FOREIGN KEY ("idOrganizacion") REFERENCES "organizaciones"("idOrganizacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umbrales" ADD CONSTRAINT "umbrales_idFlujo_fkey" FOREIGN KEY ("idFlujo") REFERENCES "flujos"("idFlujo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias_umbral" ADD CONSTRAINT "auditorias_umbral_idFlujo_fkey" FOREIGN KEY ("idFlujo") REFERENCES "flujos"("idFlujo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos" ADD CONSTRAINT "casos_idFlujo_fkey" FOREIGN KEY ("idFlujo") REFERENCES "flujos"("idFlujo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos" ADD CONSTRAINT "casos_operadorBloqueoId_fkey" FOREIGN KEY ("operadorBloqueoId") REFERENCES "operadores"("idOperador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_idCaso_fkey" FOREIGN KEY ("idCaso") REFERENCES "casos"("idCaso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senales" ADD CONSTRAINT "senales_idCaso_fkey" FOREIGN KEY ("idCaso") REFERENCES "casos"("idCaso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senales" ADD CONSTRAINT "senales_idEvidencia_fkey" FOREIGN KEY ("idEvidencia") REFERENCES "evidencias"("idEvidencia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones" ADD CONSTRAINT "decisiones_idCaso_fkey" FOREIGN KEY ("idCaso") REFERENCES "casos"("idCaso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones" ADD CONSTRAINT "decisiones_idOperador_fkey" FOREIGN KEY ("idOperador") REFERENCES "operadores"("idOperador") ON DELETE RESTRICT ON UPDATE CASCADE;
