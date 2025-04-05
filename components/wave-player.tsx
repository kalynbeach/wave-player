import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WavePlayer() {
  return (
    <Card className="wave-player bg-background aspect-[5/7] w-[380px] gap-1.5 rounded-sm border p-2">
      <CardHeader className="bg-accent/50 border p-2 gap-1">
        <CardTitle>Title</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Record - Artist
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-muted/50 flex size-full items-center justify-center border">
        <p className="text-muted-foreground text-sm">Visual</p>
      </CardContent>
      <CardFooter className="bg-input/50 flex h-32 w-full items-center justify-center border p-1.5">
        <p className="text-muted-foreground text-sm">Controls</p>
      </CardFooter>
    </Card>
  );
}
