import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PredictService, PredictResponse } from './services/predict.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  selectedFile: File | null = null;
  imageUrl = '';
  result: PredictResponse | null = null;
  error = '';
  loading = false;

  constructor(private predictService: PredictService) {}

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFile = target.files?.[0] ?? null;
    this.imageUrl = '';
    this.result = null;
    this.error = '';
  }

  predictByFile(): void {
    if (!this.selectedFile) {
      this.error = 'Selecciona un archivo primero.';
      return;
    }
    this.loading = true;
    this.predictService.predictByFile(this.selectedFile).subscribe({
      next: (res) => {
        this.result = res;
        this.error = '';
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al consultar el gateway Java.';
        this.loading = false;
      },
    });
  }

  predictByUrl(): void {
    if (!this.imageUrl.trim()) {
      this.error = 'Ingresa una URL válida.';
      return;
    }
    this.loading = true;
    this.predictService.predictByUrl(this.imageUrl).subscribe({
      next: (res) => {
        this.result = res;
        this.error = '';
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al consultar el gateway Java.';
        this.loading = false;
      },
    });
  }
}
