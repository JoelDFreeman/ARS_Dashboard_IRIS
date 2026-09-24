using System.Reflection;
using System.Text.Json;
using ActiveRolesDashboard.Models;

namespace ActiveRolesDashboard.Services;

public static class DemoDataService
{
    public static DashboardSummary CreateSummary()
    {
        var summary = new DashboardSummary
        {
            EntraLargeGroupMemberThreshold = 100,
            DynamicGroupExpensiveRuleThreshold = 10,
            Domains = new DomainSummary
            {
                TotalCount = 1,
                Items = [new DomainInfo { Name = "DEMO", DnsName = "demo.local" }]
            },
            ADUserAccounts = new ADUserAccountsSummary { Items = CreateRawItems(42, "user") },
            ADGroups = new ADGroupsSummary { Items = CreateRawItems(18, "group") },
            Computers = new ComputersSummary { Items = CreateRawItems(12, "computer") },
            EntraTotals = new EntraTotalsSummary
            {
                Tenants = ["demo.onmicrosoft.com"],
                MembershipLoaded = true,
                ByObjectType = EntraObjectTypeInfo.All
                    .Select((type, index) => new EntraObjectTypeCount { ObjectType = type, TotalCount = 8 + index * 3 })
                    .ToList()
            },
            ExchangeVisible = true,
            LicensingVisible = true
        };

        summary.ADUserAccounts.TotalCount = summary.ADUserAccounts.Items.Count;
        summary.ADGroups.TotalCount = summary.ADGroups.Items.Count;
        summary.Computers.TotalCount = summary.Computers.Items.Count;
        summary.EntraTotals.TotalCount = summary.EntraTotals.ByObjectType.Sum(item => item.TotalCount);

        foreach (var property in typeof(DashboardSummary).GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            var value = property.GetValue(summary);
            var totalCount = value?.GetType().GetProperty("TotalCount", BindingFlags.Instance | BindingFlags.Public);
            if (totalCount?.CanWrite == true && totalCount.PropertyType == typeof(int) && (int)totalCount.GetValue(value)! == 0)
                totalCount.SetValue(value, 3 + Math.Abs(property.Name.GetHashCode()) % 28);
        }

        return summary;
    }

    private static List<JsonElement> CreateRawItems(int count, string objectClass)
    {
        var items = new List<JsonElement>(count);
        for (var index = 1; index <= count; index++)
        {
            using var document = JsonDocument.Parse($"{{\"name\":\"Demo {objectClass} {index}\",\"edsaDomainNetbiosName\":\"DEMO\",\"objectClass\":\"{objectClass}\"}}");
            items.Add(document.RootElement.Clone());
        }

        return items;
    }
}