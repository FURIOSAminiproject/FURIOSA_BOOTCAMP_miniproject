/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Star, Sparkles, MapPin, Calendar, Compass, Plus, Check, Send, ThumbsUp, Bookmark } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';
import { PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN } from '../data/presetData';
import gyeongjuWoljiImg from '../assets/images/gyeongju_wolji_pond_1792364655793.jpg';

export interface SocialPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  destination: string;
  duration: string;
  travelTheme: string;
  rating: number;
  title: string;
  content: string;
  photoUrl: string;
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  comments: { id: string; user: string; text: string; time: string }[];
  planSnippet?: {
    totalBudget: string;
    mustVisit: string[];
  };
  createdAt: string;
}

const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'post-1',
    authorName: '이나경 (여행 에디터)',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    destination: '제주도 (애월 & 서귀포)',
    duration: '2박 3일',
    travelTheme: '힐링/미식',
    rating: 5,
    title: 'AI가 추천해준 몽돌해변과 흑돼지, 일차별 중복 없는 감동 여정!',
    content: '여행 계획 짤 때마다 방문지가 겹쳐서 스트레스였는데, 길벗 AI 팀이 일자별 동선 중복 0건으로 완벽하게 짜줬어요. 특히 햇살에 반짝이던 몽돌해변 자갈소리와 애월 노을 카페는 평생 잊지 못할 추억입니다.',
    photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    liked: true,
    likesCount: 142,
    commentsCount: 18,
    comments: [
      { id: 'c1', user: '박준호', text: '저도 이 일정 그대로 다녀왔는데 서귀포 흑돼지 진짜 최고였습니다!', time: '1시간 전' },
      { id: 'c2', user: '최수연', text: '몽돌해변 물 맑은 것 좀 보세요... 다음 주에 당장 떠납니다!', time: '3시간 전' }
    ],
    planSnippet: {
      totalBudget: '130만원 (2인 기준)',
      mustVisit: ['애월 한담해안산책로', '서귀포 흑돼지 명가', '사려니숲길']
    },
    createdAt: '2026-10-15'
  },
  {
    id: 'post-2',
    authorName: '강태우 (가족 여행러)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    destination: '경주',
    duration: '1박 2일',
    travelTheme: '역사/한옥',
    rating: 5,
    title: '부모님 모시고 다녀온 경주 천년 달빛 기행, 안전관리 최고!',
    content: '동선지기 에이전트 덕분에 불필요한 도보 낭비 없이 황리단길 한옥과 동궁과 월지 야경을 감상했어요. 안전관리 에이전트의 야간 수변 보행 가이드 덕에 어르신들도 안심하고 즐기셨습니다.',
    photoUrl: gyeongjuWoljiImg,
    liked: false,
    likesCount: 98,
    commentsCount: 12,
    comments: [
      { id: 'c3', user: '정다은', text: '야간 동궁과 월지 불빛이 너무 곱네요. 추천 감사합니다!', time: '5시간 전' }
    ],
    planSnippet: {
      totalBudget: '85만원 (3인 기준)',
      mustVisit: ['황리단길 한옥스테이', '동궁과 월지 야경', '불국사']
    },
    createdAt: '2026-10-14'
  },
  {
    id: 'post-3',
    authorName: '민선우 (사진 작가)',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    destination: '강릉·속초',
    duration: '2박 3일',
    travelTheme: '바다/감성카페',
    rating: 5,
    title: '동해 바다열차와 안목해변 커피거리, 시(詩)가 함께한 낭만 여행',
    content: '풍류시객 에이전트가 카페마다 써준 감성 수필과 시를 읽으며 마시는 커피는 예술이었습니다. 네이버 지도와 구글 MAP PUSH 기능으로 길 찾기도 너무 편했어요.',
    photoUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
    liked: false,
    likesCount: 115,
    commentsCount: 9,
    comments: [
      { id: 'c4', user: '오지환', text: '시와 함께하는 여행이라니 정말 품격 있네요!', time: '1일 전' }
    ],
    planSnippet: {
      totalBudget: '95만원 (2인 기준)',
      mustVisit: ['안목해변 커피거리', '초당순두부 마을', '하조대 소나무 절벽']
    },
    createdAt: '2026-10-13'
  }
];

interface TravelerSocialFeedProps {
  onLoadPresetPlan?: (plan: FullTravelPlan) => void;
  onExploreDestination?: (dest: string) => void;
}

export const TravelerSocialFeed: React.FC<TravelerSocialFeedProps> = ({
  onLoadPresetPlan,
  onExploreDestination
}) => {
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [newCommentText, setNewCommentText] = useState<{ [postId: string]: string }>({});
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDestination, setNewDestination] = useState('제주도');
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState('새로운 여행자');

  const regions = [
    { id: 'ALL', label: '전체 후기' },
    { id: '제주', label: '제주도' },
    { id: '경주', label: '경주' },
    { id: '강릉', label: '강릉·동해' },
    { id: '부산', label: '부산' }
  ];

  const filteredPosts = selectedRegion === 'ALL'
    ? posts
    : posts.filter(p => p.destination.includes(selectedRegion));

  const toggleLike = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const nextLiked = !p.liked;
          return {
            ...p,
            liked: nextLiked,
            likesCount: nextLiked ? p.likesCount + 1 : p.likesCount - 1
          };
        }
        return p;
      })
    );
  };

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommentText[postId]?.trim();
    if (!text) return;

    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const newC = {
            id: `c-${Date.now()}`,
            user: '나 (방문 여행자)',
            text,
            time: '방금 전'
          };
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newC]
          };
        }
        return p;
      })
    );

    setNewCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      authorName: newAuthor || '길벗 여행자',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      destination: newDestination,
      duration: '2박 3일',
      travelTheme: '힐링 & 안전 여행',
      rating: newRating,
      title: newTitle.trim(),
      content: newContent.trim(),
      photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      liked: false,
      likesCount: 1,
      commentsCount: 0,
      comments: [],
      planSnippet: {
        totalBudget: 'AI 맞춤 예산',
        mustVisit: ['지역 대표 명소', '로컬 블루리본 맛집', '인기 감성 뷰 카페']
      },
      createdAt: '2026-10-16'
    };

    setPosts([newPost, ...posts]);
    setIsWriteModalOpen(false);
    setNewTitle('');
    setNewContent('');
  };
};
