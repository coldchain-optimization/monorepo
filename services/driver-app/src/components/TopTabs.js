import React from 'react';
import { ScrollView, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { styles } from '../styles/appStyles';

export default function TopTabs({ tabs, activeTab, onChange }) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const useWrappedLayout = width < 430;
  const tabWidth = width < 360 ? 92 : width < 500 ? 104 : 112;

  if (useWrappedLayout) {
    return (
      <View style={styles.tabsWrapContainer}>
        <View style={styles.tabsWrap}>
          {tabs.map((t) => (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              style={[
                styles.tabBtn,
                styles.tabBtnGrid,
                activeTab === t && styles.tabBtnActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tabText,
                  styles.tabTextGrid,
                  compact && styles.tabTextCompact,
                  activeTab === t && styles.tabTextActive,
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabs}
    >
      {tabs.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          style={[
            styles.tabBtn,
            { width: tabWidth },
            compact && styles.tabBtnCompact,
            activeTab === t && styles.tabBtnActive,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabText,
              compact && styles.tabTextCompact,
              activeTab === t && styles.tabTextActive,
            ]}
          >
            {t}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
