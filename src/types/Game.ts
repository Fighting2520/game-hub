import type { Component } from 'vue';

export interface IGame {
  id: string;
  title: string;
  description: string;
  tags: string[];
  thumbnail: string;
  route: string;
  component: () => Promise<{ default: Component }>;
}