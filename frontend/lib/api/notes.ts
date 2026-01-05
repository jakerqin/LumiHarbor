import { apiClient } from './client';
import type { ApiResponse } from './types';

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  coverUrl?: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  pageSize: number;
}

export const notesApi = {
  // 获取笔记列表
  getNotes: async (page: number = 1, pageSize: number = 20): Promise<NotesResponse> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<NotesResponse>>('/api/notes', {
    //   params: { page, pageSize }
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 500));

    const total = 36;
    const noteTitles = [
      '春日樱花盛开',
      '周末家庭聚餐',
      '夏日海边度假',
      '秋天的红叶',
      '冬日雪景',
      '美食探店记录',
      '工作总结与反思',
      '读书笔记',
      '旅行规划',
      '健身计划',
    ];

    const noteContents = [
      '今天和家人一起去了公园，樱花开得正好，粉色的花瓣随风飘落，美得像一场梦。孩子们在草地上奔跑玩耍，我们坐在树下野餐，享受这难得的悠闲时光。',
      '这个周末全家人聚在一起吃饭，妈妈做了一桌子好菜。大家围坐在一起聊天，分享最近的生活，这种温馨的氛围让人特别珍惜。',
      '终于等来了期待已久的海边度假。早上在沙滩上散步，听着海浪的声音，呼吸着海风的气息，整个人都放松下来了。晚上的海鲜大餐更是让人回味无穷。',
      '秋天是我最喜欢的季节，到处都是金黄和火红的颜色。周末和朋友们去爬山，看满山的红叶，拍了很多美丽的照片。',
      '今年的第一场雪来得特别早，整个城市都被白雪覆盖。推开窗户，看着纷纷扬扬的雪花，心情变得格外宁静。',
    ];

    const mockNotes: Note[] = Array.from({ length: Math.min(pageSize, total) }, (_, i) => {
      const index = (page - 1) * pageSize + i;
      if (index >= total) return null;

      return {
        id: index + 1,
        title: noteTitles[index % noteTitles.length] + (index > 9 ? ` ${Math.floor(index / 10)}` : ''),
        content: noteContents[index % noteContents.length],
        createdAt: new Date(2024, 0, (index % 28) + 1).toISOString(),
        updatedAt: new Date(2024, 0, (index % 28) + 3).toISOString(),
        tags: [['旅行', '家庭'], ['美食'], ['工作'], ['运动'], ['读书']][index % 5],
        coverUrl: index % 3 === 0 ? `https://picsum.photos/800/400?random=${index + 500}` : undefined,
      };
    }).filter((n): n is Note => n !== null);

    return {
      notes: mockNotes,
      total,
      page,
      pageSize,
    };
  },

  // 获取笔记详情
  getNote: async (id: number): Promise<Note> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<Note>>(`/api/notes/${id}`);
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      id,
      title: '春日樱花盛开',
      content:
        '今天和家人一起去了公园，樱花开得正好，粉色的花瓣随风飘落，美得像一场梦。孩子们在草地上奔跑玩耍，我们坐在树下野餐，享受这难得的悠闲时光。\n\n春天真是一个美好的季节，万物复苏，生机勃勃。看着孩子们快乐的笑脸，突然觉得生活中最重要的就是这些平凡的幸福时刻。',
      createdAt: new Date(2024, 2, 20).toISOString(),
      updatedAt: new Date(2024, 2, 21).toISOString(),
      tags: ['旅行', '家庭', '春天'],
      coverUrl: `https://picsum.photos/1200/600?random=${id}`,
    };
  },

  // 创建笔记
  createNote: async (title: string, content: string, tags: string[]): Promise<Note> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.post<ApiResponse<Note>>('/api/notes', {
    //   title,
    //   content,
    //   tags
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      id: Date.now(),
      title,
      content,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};
