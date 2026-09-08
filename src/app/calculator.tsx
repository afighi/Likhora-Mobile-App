import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  ImageOff,
  Calculator as CalculatorIcon,
  Sparkles,
  Search,
  X,
  SlidersHorizontal,
  Pencil,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Product, fetchUserProducts } from '@/services/supabase';

const peso = (n: number) =>
  `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SortField = 'recent' | 'price' | 'profit' | 'name';
type SortDirection = 'asc' | 'desc';

// A bare "Price" chip never tells you whether you are looking at the dearest
// or the cheapest item first. Every field therefore carries a sensible default
// direction, a caption that spells the current order out in words, and an
// arrow — so the answer to "am I seeing high or low?" is always on screen.
const SORT_FIELDS: {
  id: SortField;
  label: string;
  defaultDirection: SortDirection;
  captions: { asc: string; desc: string };
}[] = [
  {
    id: 'recent',
    label: 'Date added',
    defaultDirection: 'desc',
    captions: { desc: 'Newest first', asc: 'Oldest first' },
  },
  {
    id: 'price',
    label: 'Price',
    defaultDirection: 'desc',
    captions: { desc: 'Highest price first', asc: 'Lowest price first' },
  },
  {
    id: 'profit',
    label: 'Profit',
    defaultDirection: 'desc',
    captions: { desc: 'Biggest profit first', asc: 'Smallest profit first' },
  },
  {
    id: 'name',
    label: 'Name',
    defaultDirection: 'asc',
    captions: { asc: 'A to Z', desc: 'Z to A' },
  },
];

const UNFILED_KEY = '__unfiled__';
const ACTIVE_KEY = 'active';

interface BusinessGroup {
  key: string;
  title: string;
  products: Product[];
  investment: number;
  profit: number;
}

export default function SmartCalculatorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters. Kept in state rather than the URL so switching to the form and
  // back does not reset what the user was looking at.
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSort, setShowSort] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await fetchUserProducts(userId);
    setProducts(data || []);
    setLoading(false);
  }, [userId]);

  // Refresh every time this screen comes into focus, so a product just
  // saved (or removed) in the form is always reflected here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openProduct = (product: Product) =>
    router.push({ pathname: '/calculator-product', params: { id: product.id } });

  // Categories come from the products themselves — Khora names one for every
  // product it prices, so the chip list builds itself as the user adds items.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const category = (product.category || '').trim();
      if (category) counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matching = products.filter((product) => {
      if (activeCategory && (product.category || '').trim() !== activeCategory) return false;
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        (product.category || '').toLowerCase().includes(query)
      );
    });

    // One ascending comparator per field, flipped for descending — so the
    // direction toggle can never disagree with the caption describing it.
    const ascending = (a: Product, b: Product) => {
      switch (sortField) {
        case 'price':
          return (a.selling_price || 0) - (b.selling_price || 0);
        case 'profit':
          return (a.tubo_per_piece || 0) - (b.tubo_per_piece || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
    };

    return [...matching].sort((a, b) => (sortDirection === 'asc' ? ascending(a, b) : -ascending(a, b)));
  }, [products, search, activeCategory, sortField, sortDirection]);

  const activeSort = SORT_FIELDS.find((field) => field.id === sortField) || SORT_FIELDS[0];
  const sortCaption = activeSort.captions[sortDirection];
  const sortIsDefault = sortField === 'recent' && sortDirection === 'desc';

  const filtersActive = Boolean(search.trim() || activeCategory || !sortIsDefault);

  const clearFilters = () => {
    setSearch('');
    setActiveCategory(null);
    setSortField('recent');
    setSortDirection('desc');
  };

  /** Same field toggles direction; a new field starts at its natural order. */
  const chooseSort = (field: (typeof SORT_FIELDS)[number]) => {
    if (field.id === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field.id);
    setSortDirection(field.defaultDirection);
  };

  // One price book per business roadmap: the active roadmap first, then each
  // saved roadmap from the template library. Titles come from the snapshot
  // stored on the product, so a renamed or deleted template still reads
  // correctly instead of leaving its products stranded under a blank heading.
  const groups = useMemo<BusinessGroup[]>(() => {
    const byKey = new Map<string, BusinessGroup>();

    filteredProducts.forEach((product) => {
      const key = product.business_key || UNFILED_KEY;
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          title:
            product.business_label ||
            (key === ACTIVE_KEY ? 'My current roadmap' : 'Not linked to a roadmap'),
          products: [],
          investment: 0,
          profit: 0,
        };
        byKey.set(key, group);
      }
      group.products.push(product);
      group.investment += product.batch_total_investment || 0;
      group.profit += product.batch_total_profit_potential || 0;
    });

    const rank = (key: string) => (key === ACTIVE_KEY ? 0 : key === UNFILED_KEY ? 2 : 1);

    return Array.from(byKey.values()).sort(
      (a, b) => rank(a.key) - rank(b.key) || a.title.localeCompare(b.title)
    );
  }, [filteredProducts]);

  // Totals follow the filter, so "Baked Goods" shows what that category tied up
  // and what it stands to earn — not the whole lineup's figures.
  const totalInvestment = filteredProducts.reduce((sum, p) => sum + (p.batch_total_investment || 0), 0);
  const totalProfit = filteredProducts.reduce((sum, p) => sum + (p.batch_total_profit_potential || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={LikhoraColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Smart Calculator</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={LikhoraColors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <CalculatorIcon size={26} color={LikhoraColors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Let Khora set your price</Text>
          <Text style={styles.emptyText}>
            Just tell us what you paid — Khora works out the right price, your profit, and how many
            you need to sell to earn your capital back.
          </Text>
          <TouchableOpacity style={styles.primaryCta} onPress={() => router.push('/calculator-product')} activeOpacity={0.85}>
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryCtaText}>Add your first product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Filter bar. Search and category chips are the two filters that
              actually earn their space on a price book; sort sits behind a
              toggle so the default view stays quiet. */}
          <View style={styles.filterBar}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={15} color={LikhoraColors.textPlaceholder} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products"
                  placeholderTextColor={LikhoraColors.textPlaceholder}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={10} accessibilityLabel="Clear search">
                    <X size={15} color={LikhoraColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sortToggle, showSort && styles.sortToggleActive]}
                onPress={() => setShowSort(!showSort)}
                activeOpacity={0.8}
                accessibilityLabel="Sort options"
              >
                <SlidersHorizontal size={16} color={showSort ? '#FFFFFF' : LikhoraColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showSort && (
              <View>
                <View style={styles.sortRow}>
                  {SORT_FIELDS.map((field) => {
                    const selected = sortField === field.id;
                    const Arrow = sortDirection === 'asc' ? ArrowUp : ArrowDown;
                    return (
                      <TouchableOpacity
                        key={field.id}
                        style={[styles.sortChip, selected && styles.sortChipSelected]}
                        onPress={() => chooseSort(field)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={
                          selected
                            ? `Sorted by ${field.label}, ${field.captions[sortDirection]}. Tap to reverse.`
                            : `Sort by ${field.label}, ${field.captions[field.defaultDirection]}`
                        }
                      >
                        <Text style={[styles.sortChipText, selected && styles.sortChipTextSelected]}>
                          {field.label}
                        </Text>
                        {selected && (
                          <Arrow size={11} color={LikhoraColors.primary} style={{ marginLeft: 3 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* The chips say WHAT is being sorted; this says which end you
                    are looking at, in words rather than an arrow alone. */}
                <Text style={styles.sortCaption}>
                  {sortCaption}
                  {sortField !== 'recent' && sortField !== 'name'
                    ? ' · tap the same chip to reverse'
                    : ''}
                </Text>
              </View>
            )}

            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                <TouchableOpacity
                  style={[styles.categoryChip, !activeCategory && styles.categoryChipSelected]}
                  onPress={() => setActiveCategory(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, !activeCategory && styles.categoryChipTextSelected]}>
                    All {products.length}
                  </Text>
                </TouchableOpacity>

                {categories.map((category) => {
                  const selected = activeCategory === category.name;
                  return (
                    <TouchableOpacity
                      key={category.name}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                      onPress={() => setActiveCategory(selected ? null : category.name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                        {category.name} {category.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>
                  {filtersActive ? 'Capital (filtered)' : 'Capital invested'}
                </Text>
                <Text style={styles.summaryValue}>{peso(totalInvestment)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>
                  {filtersActive ? 'Profit (filtered)' : 'Profit potential'}
                </Text>
                <Text style={[styles.summaryValue, { color: LikhoraColors.successGreen }]}>
                  {peso(totalProfit)}
                </Text>
              </View>
            </View>

            {/* What you are actually looking at right now: how much of the
                lineup is on screen, and every refinement applied to it. */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText} numberOfLines={2}>
                {filtersActive
                  ? `Showing ${filteredProducts.length} of ${products.length}`
                  : `${products.length} product${products.length === 1 ? '' : 's'}`}
                {activeCategory ? ` · ${activeCategory}` : ''}
                {search.trim() ? ` · "${search.trim()}"` : ''}
                {` · ${sortCaption}`}
              </Text>
              {filtersActive && (
                <TouchableOpacity onPress={clearFilters} hitSlop={8} activeOpacity={0.7}>
                  <Text style={styles.clearLink}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {groups.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsTitle}>No products match</Text>
                <Text style={styles.noResultsText}>
                  Try a different search, or clear the filters to see everything again.
                </Text>
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={clearFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            )}

            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle} numberOfLines={1}>
                    {group.title}
                  </Text>
                  <Text style={styles.groupCount}>
                    {group.products.length} item{group.products.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.groupMeta}>
                  {peso(group.investment)} capital · {peso(group.profit)} profit
                </Text>

                {group.products.map((product) => (
                  // The row is a plain View with the tap target and the action
                  // buttons as siblings. Nesting the buttons inside a pressable
                  // card made the card's own onPress compete with them for the
                  // tap, which is fragile on native and outright wrong on web.
                  <View key={product.id} style={styles.productCard}>
                    <TouchableOpacity
                      style={styles.productMain}
                      activeOpacity={0.85}
                      onPress={() => openProduct(product)}
                    >
                      {product.image_url ? (
                        <Image
                          source={{ uri: product.image_url }}
                          style={styles.productImage}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <ImageOff size={16} color={LikhoraColors.textPlaceholder} />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productSub} numberOfLines={1}>
                          {product.category || 'Uncategorised'} · {peso(product.total_cost_per_piece)} cost
                        </Text>
                        {product.breakeven_units ? (
                          <Text style={styles.productRoi} numberOfLines={1}>
                            Break even at {product.breakeven_units} pc{product.breakeven_units === 1 ? '' : 's'}
                            {product.breakeven_days ? ` · about ${product.breakeven_days} days` : ''}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.priceColumn}>
                        <Text style={styles.priceValue}>{peso(product.selling_price)}</Text>
                        <Text style={styles.priceTubo}>+{peso(product.tubo_per_piece)} profit</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Edit only. Deleting lives inside the product itself, so
                        a destructive action always sits behind opening the
                        thing it destroys. */}
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openProduct(product)}
                      activeOpacity={0.8}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${product.name}`}
                    >
                      <Pencil size={14} color={LikhoraColors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.fabBar}>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => router.push('/calculator-product')}
              activeOpacity={0.85}
            >
              <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryCtaText}>Price a new product</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: LikhoraColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.four,
    fontFamily: LikhoraFont.fontFamily,
  },

  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.pill,
  },
  primaryCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, fontFamily: LikhoraFont.fontFamily },

  filterBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    padding: 0,
  },
  sortToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  sortToggleActive: { backgroundColor: LikhoraColors.primary, borderColor: LikhoraColors.primary },
  sortRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  sortChipSelected: { backgroundColor: LikhoraColors.primarySoft },
  sortChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  sortChipTextSelected: { color: LikhoraColors.primary },
  sortCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    marginTop: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryRow: { gap: 6, paddingVertical: 10, paddingRight: Spacing.four },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  categoryChipSelected: { backgroundColor: LikhoraColors.primary, borderColor: LikhoraColors.primary },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryChipTextSelected: { color: '#FFFFFF' },

  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: Spacing.three,
  },
  resultsText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  clearLink: {
    fontSize: 11,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  noResults: { alignItems: 'center', paddingVertical: Spacing.five },
  noResultsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  noResultsText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  clearFiltersBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    backgroundColor: '#FFFFFF',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },

  scrollContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: 24 },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  summaryHalf: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 30, backgroundColor: LikhoraColors.border },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },

  group: { marginBottom: Spacing.four },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginRight: 8,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  groupMeta: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
    fontFamily: LikhoraFont.fontFamily,
  },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: 12,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    marginBottom: 10,
  },
  productMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  productImage: {
    width: 46,
    height: 46,
    borderRadius: Radius.medium,
    marginRight: 12,
    backgroundColor: LikhoraColors.inputBackground,
  },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  productSub: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  productRoi: {
    fontSize: 11,
    color: LikhoraColors.aiBlue,
    fontWeight: '700',
    marginTop: 3,
    fontFamily: LikhoraFont.fontFamily,
  },

  priceColumn: { alignItems: 'flex-end', marginLeft: 10 },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  priceTubo: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.successGreen,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primarySoft,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    marginLeft: 10,
  },

  fabBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: LikhoraColors.backgroundScreen,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
});
