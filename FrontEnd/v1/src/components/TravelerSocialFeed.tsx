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

  return (
    <section className="space-y-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e8e4dc] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-800 font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>REAL TRAVEL STORIES & REVIEWS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
            여행자 소셜 피드 & 일정 공유
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            AI 에이전트가 설계한 여정으로 직접 여행을 다녀온 실제 여행자들의 생생한 후기와 인증 코스를 만나보세요.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#064e43] hover:bg-[#085f52] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>내 여행 후기 공유하기</span>
          </button>
        </div>
      </div>

      {/* Region Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {regions.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRegion(r.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedRegion === r.id
                ? 'bg-[#064e43] text-white shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Post Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map(post => (
          <article
            key={post.id}
            className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group"
          >
            <div>
              {/* Image Banner */}
              <div className="relative h-52 overflow-hidden bg-stone-100">
                <img
                  src={post.photoUrl}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/20" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-[#064e43] shadow-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {post.destination}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-stone-900/70 backdrop-blur-md text-[11px] font-medium text-white">
                    {post.duration}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-1">
                    {[...Array(post.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold ml-1">{post.rating}.0</span>
                  </div>
                  <span className="text-[11px] text-stone-200">{post.createdAt}</span>
                </div>
              </div>

              {/* Author & Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <div className="text-xs font-bold text-stone-900">{post.authorName}</div>
                    <div className="text-[10px] text-stone-400">인증된 길벗 AI 여행자</div>
                  </div>
                </div>

                <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-[#064e43] transition-colors">
                  {post.title}
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                  {post.content}
                </p>

                {/* AI Plan Highlights Snippet */}
                {post.planSnippet && (
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-stone-700">
                      <span className="flex items-center gap-1 text-[#064e43]">
                        <Compass className="w-3.5 h-3.5" />
                        AI 추천 코스 요약
                      </span>
                      <span className="text-[11px] text-stone-500">{post.planSnippet.totalBudget}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {post.planSnippet.mustVisit.map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[10px] text-stone-600 font-medium">
                          ✓ {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions & Comments */}
            <div className="p-5 pt-0 space-y-3">
              <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                      post.liked ? 'text-rose-600' : 'text-stone-500 hover:text-rose-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.liked ? 'fill-rose-600 text-rose-600' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-stone-500">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </div>
                </div>

                {onLoadPresetPlan && (
                  <button
                    onClick={() => {
                      if (post.destination.includes('제주')) {
                        onLoadPresetPlan(PRESET_JEJU_PLAN);
                      } else if (post.destination.includes('경주')) {
                        onLoadPresetPlan(PRESET_GYEONGJU_PLAN);
                      }
                    }}
                    className="text-[11px] font-bold text-[#064e43] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>이 일정 자세히 보기</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* Recent Comment */}
              {post.comments.length > 0 && (
                <div className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-100 text-[11px] space-y-1">
                  <div className="font-semibold text-stone-800">
                    {post.comments[post.comments.length - 1].user}:{' '}
                    <span className="font-normal text-stone-600">
                      {post.comments[post.comments.length - 1].text}
                    </span>
                  </div>
                </div>
              )}

              {/* Add Comment Input */}
              <form onSubmit={(e) => handleAddComment(post.id, e)} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="따뜻한 댓글을 남겨보세요..."
                  value={newCommentText[post.id] || ''}
                  onChange={(e) => setNewCommentText({ ...newCommentText, [post.id]: e.target.value })}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#064e43]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#064e43] hover:text-white text-stone-600 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>

      {/* Write Post Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>나의 여행 후기 & AI 일정 공유하기</span>
              </h3>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">작성자 닉네임</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="예: 제주사랑 김민지"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#064e43]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">여행지</label>
                  <select
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:border-[#064e43]"
                  >
                    <option value="제주도">제주도</option>
                    <option value="경주">경주</option>
                    <option value="강릉·속초">강릉·속초</option>
                    <option value="부산">부산</option>
                    <option value="전주">전주</option>
                    <option value="여수·순천">여수·순천</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">만족도 별점</label>
                  <div className="flex items-center gap-1 py-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">후기 제목</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 몽돌해변 자갈과 AI가 챙겨준 준비물 덕분에 완벽했던 3일!"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#064e43]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">상세 후기 및 팁</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="AI 팀이 추천해준 코스 중 가장 좋았던 명소, 맛집 후기 및 다른 여행자를 위한 팁을 자유롭게 남겨주세요."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#064e43]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#064e43] hover:bg-[#085f52] text-white text-xs font-bold shadow-sm"
                >
                  후기 등록 및 공유
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
