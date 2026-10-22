/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FullTravelPlan } from '../types/travel';
import { AgentTeamIntro } from './AgentTeamIntro';
import { HeroBanner } from './HeroBanner';
import { TravelerSocialFeed } from './TravelerSocialFeed';

interface UserHomePageProps {
  onStartRequest: () => void;
  onOpenTripArchive: () => void;
  onQuickExplore: (destination: string) => void;
  onSelectPlan: (plan: FullTravelPlan) => void;
  onSelectDestination: (destination: string) => void;
  onOpenStudio: () => void;
  onOpenWeatherStudio: () => void;
}

export const UserHomePage: React.FC<UserHomePageProps> = ({
  onStartRequest,
  onOpenTripArchive,
  onQuickExplore,
  onSelectPlan,
  onSelectDestination,
  onOpenStudio,
  onOpenWeatherStudio,
}) => (
  <div className="space-y-12">
    <HeroBanner
      onStartRequest={onStartRequest}
      onOpenTripArchive={onOpenTripArchive}
      onQuickExplore={onQuickExplore}
      onOpenStudio={onOpenStudio}
      onOpenWeatherStudio={onOpenWeatherStudio}
    />

    <AgentTeamIntro
      onSelectPlan={onSelectPlan}
      onSelectDestination={onSelectDestination}
      onOpenStudio={onOpenStudio}
      onOpenWeatherStudio={onOpenWeatherStudio}
    />

    <TravelerSocialFeed
      onLoadPresetPlan={onSelectPlan}
      onExploreDestination={onSelectDestination}
    />
  </div>
);
