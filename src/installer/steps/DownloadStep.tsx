/**
 * DownloadStep — step 2 del wizard. Trae metadata del artifact desde
 * desktop-release-hub, dispara la descarga via `installer:download`, y
 * avanza a `path` cuando termina OK.
 *
 * TR-19.B: el handler real hace el fetch + SHA256 verify + escritura a /tmp.
 * TR-19.A: handler stub (`downloadArtifact` throws). Para dev local, este
 * step muestra el estado UI pero el invoke fallará — eso es esperado.
 */

import { createSignal, onCleanup, Show } from 'solid-js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { createContextLogger } from '@/lib/logger';
import { StepContainer } from '../components/StepContainer';
import type { InstallerStrings } from '../i18n/es';
import { downloadArtifact, onProgress } from '../ipc/handlers';
import { fetchLatestArtifact, type ReleaseHubArtifact } from '../services/release-hub';
import type { WizardMachine } from '../state/machine';

const log = createContextLogger('installer.DownloadStep');

interface DownloadStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
}

export function DownloadStep(props: DownloadStepProps) {
  const [metadata, setMetadata] = createSignal<ReleaseHubArtifact | null>(null);
  const [fetching, setFetching] = createSignal(false);
  const [downloading, setDownloading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let unsubscribe: (() => void) | undefined;

  onCleanup(() => {
    unsubscribe?.();
  });

  const loadMetadata = async () => {
    setFetching(true);
    setError(null);
    try {
      const artifact = await fetchLatestArtifact('haido', 'linux-x64');
      setMetadata(artifact);
      props.machine.setOptions({
        downloadUrl: artifact.downloadUrl,
        checksumSha256: artifact.checksumSha256,
      });
    } catch (e) {
      log.error('fetchLatestArtifact failed', e instanceof Error ? e : undefined);
      setError(String(e));
    } finally {
      setFetching(false);
    }
  };

  const handleStart = async () => {
    const artifact = metadata();
    if (!artifact) return;

    setDownloading(true);
    setError(null);

    // Subscribe to live progress events (TR-19.B los enchufa via listen()).
    // eslint-disable-next-line solid/reactivity
    unsubscribe = await onProgress((progress) => {
      props.machine.setDownloadProgress(progress);
    });

    try {
      await downloadArtifact({
        url: artifact.downloadUrl,
        checksumSha256: artifact.checksumSha256,
      });
      log.success('artifact downloaded', { url: artifact.downloadUrl });
      props.machine.next();
    } catch (e) {
      log.error('downloadArtifact failed', e instanceof Error ? e : undefined);
      setError(String(e));
    } finally {
      setDownloading(false);
      unsubscribe?.();
      unsubscribe = undefined;
    }
  };

  const progressPct = () => props.machine.state().downloadProgress?.percent ?? 0;
  const progressMessage = () => {
    const phase = props.machine.state().downloadProgress?.phase;
    if (phase === 'verifying') return props.t.download.verifying;
    return props.t.download.downloading;
  };

  return (
    <StepContainer step="download" title={props.t.download.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.download.heading}</CardTitle>
          <CardDescription>{props.t.download.description}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Show when={error()}>
            <div class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p class="font-medium">{props.t.download.errorTitle}</p>
              <p class="mt-1 text-xs opacity-90">{error()}</p>
              <Button
                variant="outline"
                size="sm"
                class="mt-2"
                onClick={() => {
                  setError(null);
                  if (metadata()) handleStart();
                  else loadMetadata();
                }}
              >
                {props.t.download.retry}
              </Button>
            </div>
          </Show>

          <Show
            when={metadata()}
            fallback={
              <Button onClick={loadMetadata} disabled={fetching() || downloading()} class="w-full">
                {props.t.download.start}
              </Button>
            }
          >
            {(artifact) => (
              <div class="space-y-3">
                <dl class="grid grid-cols-3 gap-2 text-sm">
                  <dt class="text-muted-foreground">Versión</dt>
                  <dd class="col-span-2 font-mono">{artifact().version}</dd>
                  <dt class="text-muted-foreground">SHA256</dt>
                  <dd class="col-span-2 truncate font-mono text-xs">{artifact().checksumSha256}</dd>
                  <dt class="text-muted-foreground">Tamaño</dt>
                  <dd class="col-span-2">{Math.round(artifact().bytesTotal / 1024 / 1024)} MB</dd>
                </dl>

                <Show
                  when={!downloading()}
                  fallback={
                    <div class="space-y-2">
                      <Progress value={progressPct()} />
                      <p class="text-xs text-muted-foreground">{progressMessage()}</p>
                    </div>
                  }
                >
                  <Button onClick={handleStart} class="w-full">
                    {props.t.download.start}
                  </Button>
                </Show>
              </div>
            )}
          </Show>
        </CardContent>
      </Card>
    </StepContainer>
  );
}

export default DownloadStep;
